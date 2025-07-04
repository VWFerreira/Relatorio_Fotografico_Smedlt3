// CONFIGURAÇÃO DO FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyAFVcAp2P2fytO9jZ09s_1hcx-ougPsw",
    authDomain: "relatoriosengpac.firebaseapp.com",
    databaseURL: "https://relatoriosengpac-default-rtdb.firebaseio.com",
    projectId: "relatoriosengpac",
    storageBucket: "relatoriosengpac.appspot.com",
    messagingSenderId: "990197024543",
    appId: "1:990197024543:web:7bd5375154be81bb570f54",
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const storage = firebase
    .app()
    .storage("gs://relatoriosengpac.firebasestorage.app");

let formularios = [];
let idAtual = null;
let fotosTemporarias = new Map();

// REMOVIDO: window.onload duplicado
// A inicialização agora acontece apenas no DOMContentLoaded

function configurarDragGlobal() {
    const fotosContainer = document.getElementById("fotos-container");
    if (!fotosContainer) return;

    fotosContainer.addEventListener("dragover", (e) => {
        e.preventDefault();
        fotosContainer.classList.add("dragover");
    });

    fotosContainer.addEventListener("dragleave", () => {
        fotosContainer.classList.remove("dragover");
    });

    fotosContainer.addEventListener("drop", (e) => {
        e.preventDefault();
        fotosContainer.classList.remove("dragover");
        const arquivos = Array.from(e.dataTransfer.files).filter((file) =>
            file.type.startsWith("image/")
        );
        if (arquivos.length) adicionarFotos(arquivos);
    });
}

// FUNÇÃO PRINCIPAL CORRIGIDA
function carregarFormularios(forcarTodos = true) {
    console.log("🔄 === CARREGAMENTO DE FORMULÁRIOS ===");

    const btnCarregar = document.getElementById("btn-todos-relatorios");
    if (btnCarregar) {
        btnCarregar.textContent = "⏳ Carregando...";
        btnCarregar.disabled = true;
    }

    // SEMPRE TODOS OS RELATÓRIOS
    const consulta = db.collection("formularios").orderBy("timestamp", "desc");

    consulta
        .get()
        .then((querySnapshot) => {
            console.log(`📊 Documentos encontrados: ${querySnapshot.size}`);

            // LIMPA ARRAY
            formularios = [];

            // PROCESSA CADA DOCUMENTO
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const formulario = { id: doc.id, ...data };
                formularios.push(formulario);

                console.log(
                    `📄 Carregado: ${doc.id} - ${data.obra || "Sem nome"}`
                );
            });

            console.log(
                `✅ TOTAL CARREGADO: ${formularios.length} formulários`
            );

            // ANÁLISE CORRIGIDA
            const analise = analisarFormulariosCorrigido(formularios);
            console.log("📈 ANÁLISE:", analise);

            // SUCESSO
            if (formularios.length > 0) {
                const mensagem =
                    `✅ SINCRONIZAÇÃO COMPLETA!\n\n` +
                    `📊 Total: ${formularios.length} relatórios\n` +
                    `🏫 Escolas: ${analise.totalEscolas}\n` +
                    `📷 Fotos: ${analise.totalFotos}`;

                alert(mensagem);
            }

            // ATUALIZA INTERFACE
            atualizarListaCorrigida();
        })
        .catch((error) => {
            console.error("❌ ERRO:", error);
            alert(`❌ Erro: ${error.message}`);
            formularios = [];
            atualizarListaCorrigida();
        })
        .finally(() => {
            if (btnCarregar) {
                btnCarregar.textContent = "🔄 Recarregar";
                btnCarregar.disabled = false;
            }
        });
}

// ANÁLISE CORRIGIDA (sem bug da contagem de fotos)
function analisarFormulariosCorrigido(forms) {
    const escolasUnicas = new Set();
    let totalFotos = 0;
    const porEscola = {};

    forms.forEach((form) => {
        const escola = form.obra || "Sem Escola";
        escolasUnicas.add(escola);

        if (!porEscola[escola]) {
            porEscola[escola] = { total: 0, fotos: 0 };
        }

        porEscola[escola].total++;

        // CONTAGEM CORRIGIDA DE FOTOS
        let fotosForm = 0;
        if (form.fotos && Array.isArray(form.fotos)) {
            // Conta apenas fotos que têm URL (fotos reais)
            fotosForm = form.fotos.filter(
                (foto) => foto && foto.url && foto.url.trim() !== ""
            ).length;
        }

        porEscola[escola].fotos += fotosForm;
        totalFotos += fotosForm;

        console.log(`📸 ${escola}: ${fotosForm} fotos`);
    });

    return {
        totalFormularios: forms.length,
        totalEscolas: escolasUnicas.size,
        totalFotos, // Agora está correto
        porEscola,
    };
}

// INTERFACE COMPLETAMENTE CORRIGIDA COM PROTEÇÃO CONTRA DUPLICAÇÃO
let atualizandoInterface = false;

function atualizarListaCorrigida() {
    // Proteção contra execução múltipla
    if (atualizandoInterface) {
        console.log("⚠️ Interface já está sendo atualizada, ignorando...");
        return;
    }

    atualizandoInterface = true;
    console.log("🖼️ === ATUALIZANDO INTERFACE CORRIGIDA ===");
    console.log(`📊 Formulários: ${formularios.length}`);

    const accordionContainer = document.getElementById(
        "accordion-escolas-advanced"
    );

    if (!accordionContainer) {
        console.error("❌ Container não encontrado!");
        atualizandoInterface = false;
        return;
    }

    // LIMPA COMPLETAMENTE
    accordionContainer.innerHTML = "";

    // Atualiza dashboard
    atualizarDashboardStatsCorrigido();

    // VERIFICA SE TEM DADOS
    if (formularios.length === 0) {
        accordionContainer.innerHTML = `
            <div class="empty-state text-center py-4">
                <i class="bi bi-folder2-open display-4 mb-3" style="color: #ccc;"></i>
                <h6 style="color: #666;">Nenhum relatório encontrado</h6>
                <p class="small" style="color: #999;">Clique em "Recarregar" para tentar novamente</p>
                <button class="btn btn-primary btn-sm mt-2" onclick="carregarFormularios(true)">
                    <i class="bi bi-arrow-clockwise me-1"></i>Recarregar
                </button>
            </div>
        `;
        atualizandoInterface = false;
        return;
    }

    // AGRUPAMENTO SIMPLES E DIRETO
    const escolasAgrupadas = {};
    formularios.forEach((form) => {
        const escola = form.obra || "Sem Escola";
        if (!escolasAgrupadas[escola]) {
            escolasAgrupadas[escola] = [];
        }
        escolasAgrupadas[escola].push(form);
    });

    const escolasOrdenadas = Object.keys(escolasAgrupadas).sort();
    console.log(
        `🏫 Criando ${escolasOrdenadas.length} escolas:`,
        escolasOrdenadas
    );

    // CRIA CADA ESCOLA NA INTERFACE
    escolasOrdenadas.forEach((escola, index) => {
        const formulariosEscola = escolasAgrupadas[escola];
        console.log(
            `🏗️ Criando: ${escola} (${formulariosEscola.length} relatórios)`
        );

        const escolaElement = criarEscolaElemento(
            escola,
            formulariosEscola,
            index
        );
        accordionContainer.appendChild(escolaElement);
    });

    console.log(`✅ Interface criada: ${escolasOrdenadas.length} escolas`);

    // VERIFICAÇÃO FINAL
    const escolasNaInterface = accordionContainer.children.length;
    console.log(`🔍 Verificação: ${escolasNaInterface} elementos na interface`);

    if (escolasNaInterface !== escolasOrdenadas.length) {
        console.error(
            `❌ ERRO: Esperado ${escolasOrdenadas.length}, criado ${escolasNaInterface}`
        );
    }

    // Libera a flag de proteção
    atualizandoInterface = false;
}

// FUNÇÃO PARA CRIAR ELEMENTO DE ESCOLA
function criarEscolaElemento(escola, formularios, index) {
    const collapseId = `collapse-escola-${index}`;

    const div = document.createElement("div");
    div.className = "school-group mb-3";

    // CRIAR CONTEÚDO DOS RELATÓRIOS
    const relatóriosHtml = formularios
        .map((form, idx) => {
            const dataFormatada = form.data
                ? new Date(form.data).toLocaleDateString("pt-BR")
                : "Sem data";
            const quantidadeFotos = form.fotos
                ? form.fotos.filter((f) => f && f.url && f.url.trim() !== "")
                      .length
                : 0;

            return `
            <div class="report-item" style="background: white; border: 1px solid #e0e6ed; border-radius: 10px; padding: 15px; margin-bottom: 10px;">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <div class="flex-grow-1">
                        <h6 class="mb-1" style="color: #2c3e50; font-weight: 600;">${
                            form.obra
                        }</h6>
                        <div class="d-flex flex-wrap gap-2">
                            <small style="color: #666;">
                                <i class="bi bi-calendar3 me-1"></i>${dataFormatada}
                            </small>
                            <small style="color: #666;">
                                <i class="bi bi-images me-1"></i>${quantidadeFotos} foto${
                quantidadeFotos !== 1 ? "s" : ""
            }
                            </small>
                        </div>
                    </div>
                    <span class="badge bg-success" style="font-size: 0.7rem;">
                        <i class="bi bi-check-circle me-1"></i>Salvo
                    </span>
                </div>
                
                <div class="d-flex gap-2">
                    <button type="button" class="btn btn-outline-success btn-sm flex-fill" 
                            onclick="abrirFormulario('${
                                form.id
                            }')" title="Visualizar">
                        <i class="bi bi-eye me-1"></i>Ver
                    </button>
                    <button type="button" class="btn btn-outline-primary btn-sm flex-fill" 
                            onclick="abrirFormulario('${
                                form.id
                            }'); setTimeout(() => window.print(), 500)" title="Imprimir">
                        <i class="bi bi-printer me-1"></i>Imprimir
                    </button>
                    <button type="button" class="btn btn-outline-danger btn-sm" 
                            onclick="excluirFormulario('${
                                form.id
                            }')" title="Excluir">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
        `;
        })
        .join("");

    div.innerHTML = `
        <div class="school-header" data-bs-toggle="collapse" data-bs-target="#${collapseId}" 
             aria-expanded="${index === 0 ? "true" : "false"}"
             style="background: white; border: 1px solid #e0e6ed; border-radius: 12px; padding: 15px; cursor: pointer;">
            <div class="d-flex align-items-center justify-content-between">
                <div class="d-flex align-items-center">
                    <div style="width: 40px; height: 40px; border-radius: 10px; background: linear-gradient(145deg, #17468c, #0f2654); display: flex; align-items: center; justify-content: center; margin-right: 15px;">
                        <i class="bi bi-building-fill" style="color: white; font-size: 1.1rem;"></i>
                    </div>
                    <div>
                        <h6 style="color: #2c3e50; font-weight: 600; margin: 0;">${escola}</h6>
                        <small style="color: #666;">${
                            formularios.length
                        } relatório${formularios.length > 1 ? "s" : ""}</small>
                    </div>
                </div>
                <div class="d-flex align-items-center">
                    <div style="width: 30px; height: 30px; border-radius: 50%; background: #f0f4f8; display: flex; align-items: center; justify-content: center; margin-right: 10px;">
                        <span style="font-size: 0.8rem; color: #17468c; font-weight: 600;">${
                            formularios.length
                        }</span>
                    </div>
                    <i class="bi bi-chevron-down" style="color: #666;"></i>
                </div>
            </div>
        </div>
        <div id="${collapseId}" class="collapse ${
        index === 0 ? "show" : ""
    }" data-bs-parent="#accordion-escolas-advanced">
            <div style="padding: 15px 0;">
                ${relatóriosHtml}
            </div>
        </div>
    `;

    return div;
}

// DASHBOARD CORRIGIDO
function atualizarDashboardStatsCorrigido() {
    const totalReports = document.getElementById("total-reports");
    const totalSchools = document.getElementById("total-schools");
    const thisMonth = document.getElementById("this-month");
    const dashboardStats = document.getElementById("dashboard-stats");

    if (totalReports) totalReports.textContent = formularios.length;

    // Escolas únicas
    const escolasUnicas = new Set();
    formularios.forEach((form) => {
        if (form.obra) escolasUnicas.add(form.obra);
    });
    if (totalSchools) totalSchools.textContent = escolasUnicas.size;

    // Relatórios deste mês
    const mesAtual = new Date().getMonth();
    const anoAtual = new Date().getFullYear();
    const relatóriosDesteMês = formularios.filter((form) => {
        if (!form.data) return false;
        const dataForm = new Date(form.data);
        return (
            dataForm.getMonth() === mesAtual &&
            dataForm.getFullYear() === anoAtual
        );
    }).length;
    if (thisMonth) thisMonth.textContent = relatóriosDesteMês;

    // Dashboard stats
    if (dashboardStats && formularios.length > 0) {
        dashboardStats.innerHTML = `
            <div class="col-6">
                <div class="stat-card">
                    <div class="stat-icon"><i class="bi bi-files"></i></div>
                    <div class="stat-info">
                        <div class="stat-number">${formularios.length}</div>
                        <div class="stat-label">Relatórios</div>
                    </div>
                </div>
            </div>
            <div class="col-6">
                <div class="stat-card">
                    <div class="stat-icon"><i class="bi bi-buildings"></i></div>
                    <div class="stat-info">
                        <div class="stat-number">${escolasUnicas.size}</div>
                        <div class="stat-label">Escolas</div>
                    </div>
                </div>
            </div>
        `;
    }
}

// FUNÇÃO PARA CARREGAR TODOS (botão)
function carregarTodosRelatorios() {
    console.log("🔄 Botão clicado");
    carregarFormularios(true);
}

// RESTO DAS FUNÇÕES MANTIDAS IGUAL...
async function uploadImageToStorage(file, formularioId, fotoIndex) {
    try {
        const storageRef = storage.ref();
        const fileName = `formulario_${formularioId}_foto_${fotoIndex}_${Date.now()}.jpg`;
        const imageRef = storageRef.child(
            `formularios/${formularioId}/${fileName}`
        );

        console.log(`Fazendo upload da foto ${fotoIndex + 1}...`);
        const snapshot = await imageRef.put(file);
        const downloadURL = await snapshot.ref.getDownloadURL();
        console.log(`Upload da foto ${fotoIndex + 1} concluído!`);

        return {
            url: downloadURL,
            path: snapshot.ref.fullPath,
        };
    } catch (error) {
        console.error(`Erro no upload da foto ${fotoIndex + 1}:`, error);
        throw error;
    }
}

async function deleteImagesFromStorage(fotoPaths) {
    console.log("🖼️ Deletando", fotoPaths.length, "imagens do Storage");

    const deletePromises = fotoPaths.map(async (path, index) => {
        if (path) {
            try {
                console.log(
                    `🔥 [${index + 1}/${fotoPaths.length}] Deletando:`,
                    path
                );
                const imageRef = storage.ref(path);
                await imageRef.delete();
                console.log(
                    `✅ [${index + 1}/${fotoPaths.length}] Imagem deletada:`,
                    path
                );
            } catch (error) {
                if (error.code === "storage/object-not-found") {
                    console.warn(
                        `⚠️ [${index + 1}/${
                            fotoPaths.length
                        }] Imagem não encontrada:`,
                        path
                    );
                } else {
                    console.error(
                        `❌ [${index + 1}/${
                            fotoPaths.length
                        }] Erro ao deletar:`,
                        error
                    );
                    throw error;
                }
            }
        }
    });

    try {
        await Promise.all(deletePromises);
        console.log("✅ Processamento de imagens concluído");
    } catch (error) {
        console.error("❌ Erro ao deletar imagens:", error);
        throw error;
    }
}

async function salvarFormulario() {
    // Coleta os valores dos campos inline (OBJETIVO e VISITA TÉCNICA)
    const camposInline = document.querySelectorAll(".input-inline");
    const camposInlineData = Array.from(camposInline).map((campo) => ({
        placeholder: campo.placeholder,
        value: campo.value,
    }));

    const dados = {
        obra: document.getElementById("obra").value,
        local: document.getElementById("local").value,
        medicao: document.getElementById("medicao").value,
        empresa: document.getElementById("empresa").value,
        data: document.getElementById("data").value,
        camposInline: camposInlineData, // NOVO: Salva os campos inline
        fotos: [],
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    };

    if (!dados.obra.trim()) {
        alert("Preencha o campo OBRA antes de salvar.");
        return;
    }

    const docId = idAtual || Date.now().toString();

    const btnSalvar = document.querySelector(".btn-salvar");
    const textoOriginal = btnSalvar.textContent;
    btnSalvar.textContent = "⏳ Salvando...";
    btnSalvar.disabled = true;

    try {
        // NOVA ESTRUTURA: Cards de imagem e textareas independentes
        const fotosCards = document.querySelectorAll(
            ".bloco-2-fotos .foto-card-2"
        );
        const totalFotos = fotosCards.length;
        let fotosProcessadas = 0;

        for (let i = 0; i < fotosCards.length; i++) {
            const card = fotosCards[i];
            const cardId = card.getAttribute("data-card-id");

            // Busca a textarea correspondente pelo data-card-id
            const textarea = document.querySelector(
                `textarea[data-card-id="${cardId}"]`
            );
            const descricao = textarea ? textarea.value : "";
            const img = card.querySelector("img");

            let fotoData = {
                descricao: descricao || "",
                url: null,
                path: null,
            };

            if (img && img.src && img.style.display !== "none") {
                const cardId = card.getAttribute("data-card-id") || `card_${i}`;
                const arquivo = fotosTemporarias.get(cardId);

                if (arquivo instanceof File) {
                    const uploadResult = await uploadImageToStorage(
                        arquivo,
                        docId,
                        i
                    );
                    fotoData.url = uploadResult.url;
                    fotoData.path = uploadResult.path;
                } else if (img.src.startsWith("https://")) {
                    fotoData.url = img.src;
                    const fotoExistente = formularios.find(
                        (f) => f.id === docId
                    )?.fotos?.[i];
                    fotoData.path = fotoExistente?.path || null;
                }
            }

            dados.fotos.push(fotoData);

            fotosProcessadas++;
            btnSalvar.textContent = `⏳ ${fotosProcessadas}/${totalFotos} fotos`;
        }

        await db.collection("formularios").doc(docId).set(dados);

        alert("Formulário salvo com sucesso!");
        idAtual = null;
        fotosTemporarias.clear();
        carregarFormularios(true);
        limparFormulario();
    } catch (error) {
        alert("Erro ao salvar formulário: " + error.message);
        console.error("Erro detalhado:", error);
    } finally {
        btnSalvar.textContent = textoOriginal;
        btnSalvar.disabled = false;
    }
}

function limparFormulario() {
    document.getElementById("obra").value = "";
    document.getElementById("local").value = "";
    document.getElementById("medicao").value = "";
    document.getElementById("empresa").value = "ENGPAC";
    document.getElementById("data").value = "";

    // NOVO: Limpa os campos inline
    const camposInline = document.querySelectorAll(".input-inline");
    camposInline.forEach((campo) => {
        campo.value = "";
        campo.classList.remove("auto-preenchido");
    });

    document.getElementById("fotos-container").innerHTML = "";
    fotosTemporarias.clear();
    idAtual = null;
}

function novoFormulario() {
    limparFormulario();
}

async function excluirFormulario(id) {
    if (confirm("Tem certeza que deseja excluir este formulário?")) {
        console.log("🗑️ Iniciando exclusão:", id);

        try {
            const doc = await db.collection("formularios").doc(id).get();

            if (doc.exists) {
                const data = doc.data();
                const imagePaths =
                    data.fotos
                        ?.map((foto) => foto.path)
                        .filter((path) => path) || [];

                if (imagePaths.length > 0) {
                    console.log("🔥 Deletando imagens...");
                    await deleteImagesFromStorage(imagePaths);
                }
            }

            await db.collection("formularios").doc(id).delete();
            alert("Formulário excluído com sucesso!");
            carregarFormularios(true);
        } catch (error) {
            console.error("❌ Erro ao excluir:", error);
            alert("Erro ao excluir formulário: " + error.message);
        }
    }
}

function abrirFormulario(id) {
    const form = formularios.find((f) => f.id === id);
    if (!form) return;

    document.getElementById("obra").value = form.obra || "";
    document.getElementById("local").value = form.local || "";
    document.getElementById("medicao").value = form.medicao || "";
    document.getElementById("empresa").value = form.empresa || "ENGPAC";
    document.getElementById("data").value = form.data || "";

    // NOVO: Carrega os campos inline salvos
    if (form.camposInline && form.camposInline.length > 0) {
        const camposInline = document.querySelectorAll(".input-inline");

        form.camposInline.forEach((campoSalvo) => {
            const campoAtual = Array.from(camposInline).find(
                (campo) => campo.placeholder === campoSalvo.placeholder
            );

            if (campoAtual) {
                campoAtual.value = campoSalvo.value || "";
                if (campoSalvo.value) {
                    campoAtual.classList.add("auto-preenchido");
                }
            }
        });
    } else {
        // Se não há campos salvos, preenche automaticamente com base na obra
        if (form.obra) {
            preencherCamposEscola(form.obra);
        }
    }

    document.getElementById("fotos-container").innerHTML = "";
    fotosTemporarias.clear();

    if (form.fotos && form.fotos.length > 0) {
        form.fotos.forEach((fotoData, index) => {
            criarCardFoto(
                fotoData.descricao || "",
                fotoData.url,
                `saved_${index}`
            );
        });
    }

    ajustarAlturaTextareas();
    idAtual = id;
}

function criarCardFoto(descricao = "", imagemSrc = null, cardId = null) {
    const container = document.getElementById("fotos-container");
    let blocos = container.querySelectorAll(".bloco-2-fotos"); // MUDANÇA: bloco-2-fotos
    let ultimoBloco = blocos[blocos.length - 1];

    // MUDANÇA: Agora 2 fotos por bloco ao invés de 4
    if (!ultimoBloco || ultimoBloco.children.length >= 2) {
        ultimoBloco = document.createElement("div");
        ultimoBloco.className = "bloco-2-fotos"; // NOVA CLASSE
        if (blocos.length > 0) ultimoBloco.classList.add("quebra-pagina");
        container.appendChild(ultimoBloco);
    }

    const card = document.createElement("div");
    card.className = "foto-card-2"; // NOVA CLASSE PARA 2 FOTOS

    const finalCardId =
        cardId ||
        `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    card.setAttribute("data-card-id", finalCardId);

    // ESTRUTURA: Imagem com container ajustável e botões externos
    card.innerHTML = `
        <!-- ÁREA DA IMAGEM (container que se ajusta à imagem) -->
        <div class="imagem-container" data-card-id="${finalCardId}">
            <div class="drop-area-2">
                <div class="placeholder-imagem">
                    <i class="bi bi-image" style="font-size: 2rem; color: #ccc;"></i>
                    <p style="color: #999; margin: 10px 0 0 0; font-size: 0.9rem;">
                        Arraste uma imagem ou clique para selecionar
                    </p>
                </div>
                <img style="display: none; max-width: 100%; height: auto; object-fit: contain;">
            </div>
        </div>
    `;

    // Adiciona os botões FORA do card da imagem
    const botoesArea = document.createElement("div");
    botoesArea.className = "botoes-externos no-print";
    botoesArea.innerHTML = `
        <input type="file" accept="image/*" style="display: none;" id="upload-${finalCardId}">
        <label for="upload-${finalCardId}" class="btn-mini btn-selecionar">
            <i class="bi bi-upload"></i> Selecionar
        </label>
        <button type="button" class="btn-mini btn-excluir-mini" onclick="excluirCardFoto('${finalCardId}')">
            <i class="bi bi-trash"></i> Excluir
        </button>
    `;

    // Adiciona primeiro a área de texto, depois o card da imagem
    const textoArea = document.createElement("div");
    textoArea.className = "texto-area-independente";
    textoArea.innerHTML = `
        <textarea placeholder="Descrição do serviço" 
                  class="descricao-servico-2" 
                  data-card-id="${finalCardId}">${descricao}</textarea>
    `;

    // Cria um container para texto + imagem + botões
    const itemContainer = document.createElement("div");
    itemContainer.className = "item-container";
    itemContainer.appendChild(textoArea);
    itemContainer.appendChild(card);
    itemContainer.appendChild(botoesArea);

    ultimoBloco.appendChild(itemContainer);

    // Configurar eventos
    configurarEventosCard(card, finalCardId);

    // Se tem imagem salva, carrega ela
    if (imagemSrc) {
        const img = card.querySelector("img");
        const placeholder = card.querySelector(".placeholder-imagem");
        img.src = imagemSrc;
        img.style.display = "block";
        placeholder.style.display = "none";
    }
}

// FUNÇÃO: Configurar eventos do card (com verificações de segurança)
function configurarEventosCard(card, cardId) {
    // Verificações de segurança
    if (!card) {
        console.warn(`Card não encontrado para cardId: ${cardId}`);
        return;
    }

    const dropArea = card.querySelector(".drop-area-2");
    const img = card.querySelector("img");
    const placeholder = card.querySelector(".placeholder-imagem");

    // O input agora está fora do card, na área de botões
    const input = document.querySelector(`#upload-${cardId}`);

    // Verifica se os elementos existem antes de adicionar eventos
    if (!dropArea) {
        console.warn(`DropArea não encontrada no card ${cardId}`);
        return;
    }

    if (!input) {
        console.warn(`Input não encontrado para cardId ${cardId}`);
        return;
    }

    // Drag & Drop
    dropArea.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropArea.classList.add("dragover");
    });

    dropArea.addEventListener("dragleave", () => {
        dropArea.classList.remove("dragover");
    });

    dropArea.addEventListener("drop", (e) => {
        e.preventDefault();
        dropArea.classList.remove("dragover");
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith("image/")) {
            previewFile(file, img, cardId, placeholder);
        }
    });

    // Click para selecionar
    dropArea.addEventListener("click", () => {
        input.click();
    });

    // Input change
    input.addEventListener("change", () => {
        if (input.files.length > 0) {
            previewFile(input.files[0], img, cardId, placeholder);
        }
    });

    // Configurar auto-resize para textarea
    const textarea = document.querySelector(
        `textarea[data-card-id="${cardId}"]`
    );
    if (textarea) {
        // Auto-resize inicial
        ajustarAlturaTextarea(textarea);

        // Auto-resize ao digitar
        textarea.addEventListener("input", () => {
            ajustarAlturaTextarea(textarea);
        });
    }
}

// FUNÇÃO: Ajustar altura de uma textarea específica
function ajustarAlturaTextarea(textarea) {
    if (!textarea) {
        console.warn("Textarea não encontrada para ajuste de altura");
        return;
    }

    textarea.style.height = "auto";
    textarea.style.height = Math.max(40, textarea.scrollHeight) + "px";
}

// FUNÇÃO: Preview com ajuste automático do container e ordem
function previewFile(file, img, cardId, placeholder) {
    fotosTemporarias.set(cardId, file);

    const reader = new FileReader();
    reader.onload = (e) => {
        img.onload = () => {
            img.style.display = "block";
            if (placeholder) placeholder.style.display = "none";

            // Ajusta o container para o tamanho da imagem
            const dropArea = img.closest(".drop-area-2");
            if (dropArea) {
                dropArea.style.height = "auto";
                dropArea.style.minHeight = "auto";
            }

            // Adiciona atributo de ordem
            img.setAttribute("data-order", cardId.split("_")[2]);
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// FUNÇÃO: Excluir card de foto (estrutura com botões externos)
function excluirCardFoto(cardId) {
    // Remove o card da imagem
    const card = document.querySelector(
        `.foto-card-2[data-card-id="${cardId}"]`
    );

    // Remove a área de texto correspondente
    const textarea = document.querySelector(
        `textarea[data-card-id="${cardId}"]`
    );

    // Remove o container completo (texto + imagem + botões)
    const itemContainer = card
        ? card.closest(".item-container")
        : textarea
        ? textarea.closest(".item-container")
        : null;

    if (itemContainer) {
        fotosTemporarias.delete(cardId);
        itemContainer.remove();

        // Remove blocos vazios
        const blocosVazios = document.querySelectorAll(".bloco-2-fotos:empty");
        blocosVazios.forEach((bloco) => bloco.remove());
    }
}

// FUNÇÃO MODIFICADA: Adicionar fotos (agora 2 por vez e em ordem sequencial)
function adicionarFotos(arquivos = []) {
    if (arquivos.length === 0) {
        criarCardFoto();
        return;
    }

    // Converte para array e ordena pela ordem de seleção
    arquivos = Array.from(arquivos).sort((a, b) => {
        // Se os arquivos têm lastModified, usa isso como critério
        if (a.lastModified && b.lastModified) {
            return a.lastModified - b.lastModified;
        }
        return 0; // mantém a ordem original se não tiver lastModified
    });

    // Processa cada arquivo em ordem
    arquivos.forEach((arquivo, index) => {
        console.log(`Processando arquivo ${index + 1}/${arquivos.length}`);

        const cardId = `new_${Date.now()}_${index}`;
        criarCardFoto("", null, cardId);

        // Pega o card recém-criado
        const card = document.querySelector(
            `.foto-card-2[data-card-id="${cardId}"]`
        );

        if (!card) {
            console.warn(`Card não encontrado após criação: ${cardId}`);
            return;
        }

        const img = card.querySelector("img");
        const placeholder = card.querySelector(".placeholder-imagem");

        if (arquivo instanceof File) {
            previewFile(arquivo, img, cardId, placeholder);
        }
    });

    // Ajusta a altura das textareas após adicionar todas as fotos
    setTimeout(ajustarAlturaTextareas, 100);
}

function atualizarEndereco() {
    const escolaSelecionada = document.getElementById("obra").value;
    const enderecoCampo = document.getElementById("local");
    const empresaCampo = document.getElementById("empresa");

    const enderecosEscolas = {
        "EMEEF Prof. Luiz Francisco Lucena Borges":
            "Rua Cláudio Manoel da Costa, 270 – Jardim Itu Sabará – CEP 91210-250",
        "EMEF Nossa Senhora de Fátima":
            "Rua A, nº 15 – Vila Nossa Senhora de Fátima – Bom Jesus – CEP 91420-701",
        "EMEF José Mariano Beck":
            "Rua Joaquim Porto Villanova, 135 – Jardim Carvalho – CEP 91410-400",
        "EMEF América":
            "Rua Padre Ângelo Costa, 175 – Vila Vargas – Partenon – CEP 91520-161",
        "EMEF Prof. Judith Macedo de Araújo":
            "Rua Saul Constantino, 100 – Vila São José – CEP 91520-716",
        "EMEF Dep. Marcírio Goulart Loureiro":
            "Rua Saibreira, 1 – Bairro Coronel Aparício Borges – CEP 91510-350",
        "EMEF Morro da Cruz":
            "Rua Santa Teresa, 541 – Bairro São José – CEP 91520-713",
        "EMEF Heitor Villa Lobos":
            "Avenida Santo Dias da Silva, s/nº – Lomba do Pinheiro – CEP 91550-240",
        "EMEF Rincão":
            "Rua Luiz Otávio, 347 - Belém Velho, Porto Alegre - RS, 91787-330",
        "EMEF Afonso Guerreiro Lima":
            "R. Guaíba, 203 - Lomba do Pinheiro, Porto Alegre - RS, 91560-640",
        "EMEF Saint Hilaire":
            "R. Gervazio Braga Pinheiro, 427 - Lomba do Pinheiro, Porto Alegre - RS, 91570-490",
        "EMEI Protásio Alves":
            "Rua Aracy Fróes, 210 – Jardim Sabará – CEP 91210-230",
        "EMEI Vale Verde": "Rua Franklin, 270 – Jardim Sabará – CEP 91210-060",
        "EMEI Jardim Bento Gonçalves":
            "Rua Sargento Expedicionário Geraldo Santana, 40 – Partenon – CEP 91530-640",
        "EMEI Padre Ângelo Costa":
            "Rua Primeiro de Março, 300 – Bairro Partenon – CEP 91520-620",
        "EMEI Dr. Walter Silber":
            "Rua Frei Clemente, 150 – Vila São José – CEP 91520-260",
        "EMEI Maria Marques Fernandes":
            "Avenida Santo Dias da Silva, 550 – Lomba do Pinheiro – CEP 91550-500",
        "EMEI Vila Mapa II":
            "Rua Pedro Golombiewski, 100 – Lomba do Pinheiro – CEP 91550-230",
        "EMEI Vila Nova São Carlos":
            "DR. Darcy Reis Nunes, 30 - Lomba do Pinheiro, Porto Alegre - RS, 91560-570",
    };

    let enderecoBase = enderecosEscolas[escolaSelecionada] || "";
    if (enderecoBase && !enderecoBase.toLowerCase().includes("porto alegre")) {
        enderecoBase += " – Porto Alegre, RS";
    }

    enderecoCampo.value = enderecoBase;
    empresaCampo.value = "ENGPAC";

    // NOVO: Preencher automaticamente os campos de OBJETIVO e VISITA TÉCNICA
    preencherCamposEscola(escolaSelecionada);
}

// NOVA FUNÇÃO: Preencher campos com nome da escola
function preencherCamposEscola(nomeEscola) {
    // Busca os campos input-inline no OBJETIVO e VISITA TÉCNICA
    const camposEscola = document.querySelectorAll(
        '.input-inline[placeholder*="Nome da Escola"]'
    );

    camposEscola.forEach((campo, index) => {
        if (nomeEscola) {
            // Animação suave ao preencher
            setTimeout(() => {
                campo.value = nomeEscola;
                campo.classList.add("auto-preenchido");

                // Pequena animação de destaque
                campo.style.transform = "scale(1.02)";
                setTimeout(() => {
                    campo.style.transform = "scale(1)";
                }, 200);
            }, index * 100); // Delay escalonado para múltiplos campos
        } else {
            campo.value = "";
            campo.classList.remove("auto-preenchido");
            campo.style.transform = "scale(1)";
        }
    });

    // Log opcional para debug
    if (nomeEscola) {
        console.log(`✅ Campos preenchidos automaticamente: ${nomeEscola}`);
    }
}

// Event listener para auto-resize das textareas (nova estrutura)
document.addEventListener("input", function (event) {
    if (event.target.classList.contains("descricao-servico-2")) {
        ajustarAlturaTextarea(event.target);
    }
});

// FUNÇÃO MODIFICADA: Ajustar altura das textareas (nova classe)
function ajustarAlturaTextareas() {
    document.querySelectorAll(".descricao-servico-2").forEach((el) => {
        el.style.height = "auto";
        el.style.height = el.scrollHeight + 2 + "px";
    });
}

// FUNÇÕES AVANÇADAS DO SIDEBAR

function atualizarDataHora() {
    const dataHoraPainel = document.getElementById("dataHoraPainel");
    if (dataHoraPainel) {
        const agora = new Date().toLocaleString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
        dataHoraPainel.textContent = agora;
    }
    setTimeout(atualizarDataHora, 60000);
}

function configurarFiltrosAvancados() {
    const searchInput = document.getElementById("search-input");
    if (searchInput) {
        searchInput.addEventListener("input", function (e) {
            const termo = e.target.value.toLowerCase();
            filtrarRelatórios(termo);
        });
    }

    document.querySelectorAll(".filter-chip").forEach((chip) => {
        chip.addEventListener("click", function () {
            document
                .querySelectorAll(".filter-chip")
                .forEach((c) => c.classList.remove("active"));
            this.classList.add("active");

            const filtro = this.dataset.filter;
            aplicarFiltro(filtro);
        });
    });

    document.querySelectorAll("[data-view]").forEach((btn) => {
        btn.addEventListener("click", function () {
            document
                .querySelectorAll("[data-view]")
                .forEach((b) => b.classList.remove("active"));
            this.classList.add("active");

            const view = this.dataset.view;
            alterarVisualizacao(view);
        });
    });
}

function filtrarRelatórios(termo) {
    const relatórios = document.querySelectorAll(".report-item");
    relatórios.forEach((item) => {
        const título = item.querySelector("h6").textContent.toLowerCase();
        const data = item.querySelector("small").textContent.toLowerCase();

        if (título.includes(termo) || data.includes(termo)) {
            item.style.display = "block";
            item.style.opacity = "1";
        } else {
            item.style.opacity = "0.3";
            setTimeout(() => {
                if (item.style.opacity === "0.3") {
                    item.style.display = "none";
                }
            }, 300);
        }
    });
}

function aplicarFiltro(filtro) {
    const agora = new Date();
    const relatórios = document.querySelectorAll(".report-item");

    relatórios.forEach((item) => {
        let mostrar = true;

        if (filtro === "recent") {
            const dataTexto = item.querySelector("small").textContent;
            const dataMatch = dataTexto.match(/\d{2}\/\d{2}\/\d{4}/);
            if (dataMatch) {
                const [dia, mes, ano] = dataMatch[0].split("/");
                const dataRelatorio = new Date(ano, mes - 1, dia);
                const diasDiferenca =
                    (agora - dataRelatorio) / (1000 * 60 * 60 * 24);
                mostrar = diasDiferenca <= 7;
            }
        } else if (filtro === "favorites") {
            mostrar = false;
        }

        item.style.display = mostrar ? "block" : "none";
    });
}

function alterarVisualizacao(view) {
    const container = document.getElementById("accordion-escolas-advanced");
    if (view === "list") {
        container.classList.add("list-view");
    } else {
        container.classList.remove("list-view");
    }
}

// INICIALIZAÇÃO
document.addEventListener("DOMContentLoaded", function () {
    console.log("🚀 DOM carregado, inicializando...");

    configurarDragGlobal();

    const dataInput = document.getElementById("data");
    if (dataInput) {
        dataInput.value = new Date().toISOString().split("T")[0];
    }

    atualizarDataHora();

    if (typeof AOS !== "undefined") {
        AOS.init({
            duration: 600,
            easing: "ease-out-cubic",
            once: false,
            offset: 50,
            delay: 0,
        });
    }

    if (typeof gsap !== "undefined") {
        gsap.set(".advanced-logo", { scale: 0.8, opacity: 0 });
        gsap.to(".advanced-logo", {
            scale: 1,
            opacity: 1,
            duration: 1,
            ease: "elastic.out(1, 0.5)",
            delay: 0.3,
        });

        gsap.from(".title-section", {
            y: 20,
            opacity: 0,
            duration: 0.8,
            delay: 0.5,
        });

        gsap.from(".stats-overview", {
            y: 20,
            opacity: 0,
            duration: 0.8,
            delay: 0.7,
        });
    }

    configurarFiltrosAvancados();

    // Carregamento automático após um pequeno delay
    console.log("⏱️ Iniciando carregamento em 2 segundos...");
    setTimeout(() => {
        carregarFormularios(true);
    }, 2000);
});

console.log(`
🎯 === SISTEMA MODIFICADO: 2 IMAGENS POR PÁGINA ===
✅ Layout otimizado para impressão
✅ Texto separado da imagem
✅ 2 fotos por página
✅ Quebra de página automática
`);

// FUNÇÕES DE DEBUG PARA CONSOLE
function debugCompleto() {
    console.log("🔍 === DEBUG COMPLETO ===");
    console.log(`📊 Formulários no array: ${formularios.length}`);

    if (formularios.length > 0) {
        console.log("📋 Primeiros 3 formulários:", formularios.slice(0, 3));

        const escolas = {};
        let totalFotosReal = 0;

        formularios.forEach((form) => {
            const escola = form.obra || "Sem escola";
            if (!escolas[escola]) escolas[escola] = 0;
            escolas[escola]++;

            // Conta fotos com URL válida
            if (form.fotos && Array.isArray(form.fotos)) {
                const fotosComUrl = form.fotos.filter(
                    (f) => f && f.url && f.url.trim() !== ""
                ).length;
                totalFotosReal += fotosComUrl;
            }
        });

        console.log("🏫 Escolas encontradas:", escolas);
        console.log(`📸 Total de fotos real: ${totalFotosReal}`);
    }

    const container = document.getElementById("accordion-escolas-advanced");
    if (container) {
        const seçõesNaInterface = container.children.length;
        console.log(`🖼️ Seções na interface: ${seçõesNaInterface}`);

        if (seçõesNaInterface > 0) {
            console.log(
                "📄 Primeira seção HTML:",
                container.children[0].outerHTML.substring(0, 200) + "..."
            );
        }
    } else {
        console.error("❌ Container da interface não encontrado!");
    }
}

function forcarAtualizacaoCompleta() {
    console.log("🔄 Forçando atualização completa...");

    // Limpa dados
    formularios = [];

    // Recarrega
    carregarFormularios(true);
}

function testarInterface() {
    console.log("🧪 Testando criação da interface...");

    // Dados de teste
    const dadosTeste = [
        { id: "teste1", obra: "Escola Teste 1", data: "2025-01-01", fotos: [] },
        { id: "teste2", obra: "Escola Teste 2", data: "2025-01-02", fotos: [] },
    ];

    formularios = dadosTeste;
    atualizarListaCorrigida();

    console.log("✅ Teste concluído");
}

// EXPOR FUNÇÕES PARA CONSOLE
window.debugCompleto = debugCompleto;
window.forcarAtualizacaoCompleta = forcarAtualizacaoCompleta;
window.testarInterface = testarInterface;
window.carregarTodosRelatorios = carregarTodosRelatorios;

console.log(`
🔧 === FUNÇÕES DISPONÍVEIS NO CONSOLE ===
- debugCompleto() - Debug completo do sistema
- forcarAtualizacaoCompleta() - Força recarregamento
- testarInterface() - Testa interface com dados mock
- carregarTodosRelatorios() - Recarrega dados
`);

// AUTO-VERIFICAÇÃO REMOVIDA para evitar duplicações
