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

// Variáveis globais para corte
let corteAtivo = false;
let corteInicio = null;
let corteFim = null;
let corteRetangulo = null;
let corteCardIdAtual = null;
let imagemOriginalEditor = null; // NOVO: guarda a imagem original do editor

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
    dropArea.addEventListener("click", (e) => {
        // Só abre o seletor se não há imagem carregada
        if (img.style.display === "none" || !img.src) {
            input.click();
        }
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

            // Adiciona botão de edição
            adicionarBotaoEdicao(img, cardId);
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// NOVA FUNÇÃO: Adicionar botão de edição
function adicionarBotaoEdicao(img, cardId) {
    const dropArea = img.closest(".drop-area-2");
    if (!dropArea) return;

    // Remove botões existentes se houver
    const botoesExistentes = dropArea.querySelectorAll(
        ".btn-editar-imagem, .btn-trocar-imagem"
    );
    botoesExistentes.forEach((btn) => btn.remove());

    // Cria botão de edição
    const botaoEditar = document.createElement("button");
    botaoEditar.className = "btn-editar-imagem";
    botaoEditar.innerHTML = '<i class="bi bi-pencil-square"></i>';
    botaoEditar.title = "Editar imagem";
    botaoEditar.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation(); // Impede que o clique propague para a dropArea
        abrirEditorImagem(img, cardId);
    };

    // Cria botão de trocar imagem
    const botaoTrocar = document.createElement("button");
    botaoTrocar.className = "btn-trocar-imagem";
    botaoTrocar.innerHTML = '<i class="bi bi-arrow-repeat"></i>';
    botaoTrocar.title = "Trocar imagem";
    botaoTrocar.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const input = document.querySelector(`#upload-${cardId}`);
        if (input) input.click();
    };

    dropArea.appendChild(botaoEditar);
    dropArea.appendChild(botaoTrocar);
}

// NOVA FUNÇÃO: Abrir editor de imagem
function abrirEditorImagem(img, cardId) {
    // Cria modal do editor
    const modal = document.createElement("div");
    modal.className = "modal-editor-imagem";
    modal.innerHTML = `
        <div class="modal-content-editor">
            <div class="modal-header-editor">
                <h5>Editor de Imagem</h5>
                <button class="btn-fechar" onclick="fecharEditorImagem()">&times;</button>
            </div>
            <div class="modal-body-editor">
                <div class="editor-container">
                    <div class="canvas-container">
                        <canvas id="canvas-editor-${cardId}"></canvas>
                    </div>
                    <div class="controles-editor">
                        <div class="grupo-controle">
                            <label>Redimensionar:</label>
                            <div class="controles-redimensionar">
                                <input type="number" id="largura-${cardId}" placeholder="Largura" min="100" max="2000">
                                <span>x</span>
                                <input type="number" id="altura-${cardId}" placeholder="Altura" min="100" max="2000">
                                <button onclick="redimensionarImagem('${cardId}')" class="btn-aplicar">Aplicar</button>
                            </div>
                        </div>
                        
                        <div class="grupo-controle">
                            <label>Rotacionar:</label>
                            <div class="controles-rotacao">
                                <button onclick="rotacionarImagem('${cardId}', -90)" class="btn-rotacao">
                                    <i class="bi bi-arrow-counterclockwise"></i> -90°
                                </button>
                                <button onclick="rotacionarImagem('${cardId}', 90)" class="btn-rotacao">
                                    <i class="bi bi-arrow-clockwise"></i> +90°
                                </button>
                                <button onclick="rotacionarImagem('${cardId}', 180)" class="btn-rotacao">
                                    <i class="bi bi-arrow-repeat"></i> 180°
                                </button>
                            </div>
                        </div>
                        
                        <div class="grupo-controle">
                            <label>Cortar:</label>
                            <div class="controles-corte">
                                <button onclick="ativarCorte('${cardId}')" class="btn-corte">
                                    <i class="bi bi-crop"></i> Ativar Corte
                                </button>
                                <button onclick="aplicarCorte('${cardId}')" class="btn-aplicar" id="btn-aplicar-corte-${cardId}" style="display: none;">
                                    Aplicar Corte
                                </button>
                            </div>
                        </div>
                        
                        <div class="grupo-controle">
                            <label>Filtros:</label>
                            <div class="controles-filtros">
                                <button onclick="aplicarFiltro('${cardId}', 'grayscale')" class="btn-filtro">Preto e Branco</button>
                                <button onclick="aplicarFiltro('${cardId}', 'sepia')" class="btn-filtro">Sépia</button>
                                <button onclick="aplicarFiltro('${cardId}', 'invert')" class="btn-filtro">Inverter</button>
                                <button onclick="aplicarFiltro('${cardId}', 'brightness')" class="btn-filtro">Brilho</button>
                                <button onclick="aplicarFiltro('${cardId}', 'contrast')" class="btn-filtro">Contraste</button>
                            </div>
                        </div>
                        
                        <div class="grupo-controle">
                            <label>Brilho/Contraste:</label>
                            <div class="controles-ajuste">
                                <input type="range" id="brilho-${cardId}" min="0" max="200" value="100" onchange="ajustarBrilho('${cardId}')">
                                <span>Brilho</span>
                            </div>
                            <div class="controles-ajuste">
                                <input type="range" id="contraste-${cardId}" min="0" max="200" value="100" onchange="ajustarContraste('${cardId}')">
                                <span>Contraste</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer-editor">
                <button onclick="salvarEdicaoImagem('${cardId}')" class="btn-salvar-edicao">Salvar</button>
                <button onclick="cancelarEdicaoImagem('${cardId}')" class="btn-cancelar">Cancelar</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Salva a imagem original para corte
    imagemOriginalEditor = new Image();
    imagemOriginalEditor.src = img.src;
    imagemOriginalEditor.onload = () => {
        inicializarCanvas(img, cardId);
    };
}

// NOVA FUNÇÃO: Inicializar canvas
function inicializarCanvas(img, cardId) {
    const canvas = document.getElementById(`canvas-editor-${cardId}`);
    const ctx = canvas.getContext("2d");

    // Define tamanho do canvas
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    // Desenha a imagem original
    ctx.drawImage(img, 0, 0);

    // Preenche campos de dimensões
    document.getElementById(`largura-${cardId}`).value = img.naturalWidth;
    document.getElementById(`altura-${cardId}`).value = img.naturalHeight;

    // Armazena contexto para uso posterior
    canvas.dataset.ctx = ctx;
}

// NOVA FUNÇÃO: Redimensionar imagem
function redimensionarImagem(cardId) {
    const canvas = document.getElementById(`canvas-editor-${cardId}`);
    const ctx = canvas.getContext("2d");
    const largura = parseInt(
        document.getElementById(`largura-${cardId}`).value
    );
    const altura = parseInt(document.getElementById(`altura-${cardId}`).value);

    if (largura && altura) {
        // Cria canvas temporário
        const tempCanvas = document.createElement("canvas");
        const tempCtx = tempCanvas.getContext("2d");

        tempCanvas.width = largura;
        tempCanvas.height = altura;

        // Redimensiona
        tempCtx.drawImage(canvas, 0, 0, largura, altura);

        // Atualiza canvas principal
        canvas.width = largura;
        canvas.height = altura;
        ctx.drawImage(tempCanvas, 0, 0);
    }
}

// NOVA FUNÇÃO: Rotacionar imagem
function rotacionarImagem(cardId, angulo) {
    const canvas = document.getElementById(`canvas-editor-${cardId}`);
    const ctx = canvas.getContext("2d");

    const tempCanvas = document.createElement("canvas");
    const tempCtx = tempCanvas.getContext("2d");

    // Calcula novas dimensões
    const rad = (angulo * Math.PI) / 180;
    const cos = Math.abs(Math.cos(rad));
    const sin = Math.abs(Math.sin(rad));

    const novaLargura = canvas.width * cos + canvas.height * sin;
    const novaAltura = canvas.width * sin + canvas.height * cos;

    tempCanvas.width = novaLargura;
    tempCanvas.height = novaAltura;

    // Aplica rotação
    tempCtx.translate(novaLargura / 2, novaAltura / 2);
    tempCtx.rotate(rad);
    tempCtx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);

    // Atualiza canvas principal
    canvas.width = novaLargura;
    canvas.height = novaAltura;
    ctx.drawImage(tempCanvas, 0, 0);

    // Atualiza campos de dimensões
    document.getElementById(`largura-${cardId}`).value = novaLargura;
    document.getElementById(`altura-${cardId}`).value = novaAltura;
}

// NOVA FUNÇÃO: Aplicar filtros
function aplicarFiltro(cardId, tipo) {
    const canvas = document.getElementById(`canvas-editor-${cardId}`);
    const ctx = canvas.getContext("2d");
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    switch (tipo) {
        case "grayscale":
            for (let i = 0; i < data.length; i += 4) {
                const gray =
                    data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
                data[i] = gray;
                data[i + 1] = gray;
                data[i + 2] = gray;
            }
            break;
        case "sepia":
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                data[i] = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189);
                data[i + 1] = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168);
                data[i + 2] = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131);
            }
            break;
        case "invert":
            for (let i = 0; i < data.length; i += 4) {
                data[i] = 255 - data[i];
                data[i + 1] = 255 - data[i + 1];
                data[i + 2] = 255 - data[i + 2];
            }
            break;
        case "brightness":
            for (let i = 0; i < data.length; i += 4) {
                data[i] = Math.min(255, data[i] + 40);
                data[i + 1] = Math.min(255, data[i + 1] + 40);
                data[i + 2] = Math.min(255, data[i + 2] + 40);
            }
            break;
        case "contrast":
            const factor = (259 * (128 + 50)) / (255 * (259 - 50));
            for (let i = 0; i < data.length; i += 4) {
                data[i] = Math.min(
                    255,
                    Math.max(0, factor * (data[i] - 128) + 128)
                );
                data[i + 1] = Math.min(
                    255,
                    Math.max(0, factor * (data[i + 1] - 128) + 128)
                );
                data[i + 2] = Math.min(
                    255,
                    Math.max(0, factor * (data[i + 2] - 128) + 128)
                );
            }
            break;
    }
    ctx.putImageData(imageData, 0, 0);
}

// NOVA FUNÇÃO: Ajustar brilho
function ajustarBrilho(cardId) {
    const canvas = document.getElementById(`canvas-editor-${cardId}`);
    const ctx = canvas.getContext("2d");
    const valor = document.getElementById(`brilho-${cardId}`).value;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, data[i] * (valor / 100));
        data[i + 1] = Math.min(255, data[i + 1] * (valor / 100));
        data[i + 2] = Math.min(255, data[i + 2] * (valor / 100));
    }

    ctx.putImageData(imageData, 0, 0);
}

// NOVA FUNÇÃO: Ajustar contraste
function ajustarContraste(cardId) {
    const canvas = document.getElementById(`canvas-editor-${cardId}`);
    const ctx = canvas.getContext("2d");
    const valor = document.getElementById(`contraste-${cardId}`).value;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(
            255,
            Math.max(0, (data[i] - 128) * (valor / 100) + 128)
        );
        data[i + 1] = Math.min(
            255,
            Math.max(0, (data[i + 1] - 128) * (valor / 100) + 128)
        );
        data[i + 2] = Math.min(
            255,
            Math.max(0, (data[i + 2] - 128) * (valor / 100) + 128)
        );
    }

    ctx.putImageData(imageData, 0, 0);
}

// NOVA FUNÇÃO: Salvar edição
function salvarEdicaoImagem(cardId) {
    const canvas = document.getElementById(`canvas-editor-${cardId}`);
    const img = document.querySelector(
        `img[data-order="${cardId.split("_")[2]}"]`
    );

    if (img && canvas) {
        // Converte canvas para blob
        canvas.toBlob(
            (blob) => {
                // Cria novo arquivo
                const novoArquivo = new File(
                    [blob],
                    `imagem_editada_${Date.now()}.jpg`,
                    {
                        type: "image/jpeg",
                    }
                );

                // Atualiza foto temporária
                fotosTemporarias.set(cardId, novoArquivo);

                // Atualiza imagem
                const reader = new FileReader();
                reader.onload = (e) => {
                    img.src = e.target.result;
                };
                reader.readAsDataURL(novoArquivo);
            },
            "image/jpeg",
            0.9
        );
    }

    fecharEditorImagem();
}

// NOVA FUNÇÃO: Cancelar edição
function cancelarEdicaoImagem(cardId) {
    fecharEditorImagem();
}

// NOVA FUNÇÃO: Fechar editor
function fecharEditorImagem() {
    const modal = document.querySelector(".modal-editor-imagem");
    if (modal) {
        modal.remove();
    }
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

function desenharCorte(canvas) {
    const ctx = canvas.getContext("2d");
    // Redesenha a imagem original (sempre a original, não o canvas)
    if (!imagemOriginalEditor) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imagemOriginalEditor, 0, 0, canvas.width, canvas.height);

    // Desenha a área de corte se houver seleção
    if (corteRetangulo && corteRetangulo.w > 0 && corteRetangulo.h > 0) {
        ctx.save();
        // Área selecionada com borda verde
        ctx.strokeStyle = "#28a745";
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(
            corteRetangulo.x,
            corteRetangulo.y,
            corteRetangulo.w,
            corteRetangulo.h
        );

        // Área escura fora da seleção
        ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.clearRect(
            corteRetangulo.x,
            corteRetangulo.y,
            corteRetangulo.w,
            corteRetangulo.h
        );
        ctx.drawImage(
            imagemOriginalEditor,
            corteRetangulo.x,
            corteRetangulo.y,
            corteRetangulo.w,
            corteRetangulo.h,
            corteRetangulo.x,
            corteRetangulo.y,
            corteRetangulo.w,
            corteRetangulo.h
        );

        ctx.restore();
    } else if (corteInicio && corteFim) {
        // Seleção em andamento (durante o arrasto)
        ctx.save();
        ctx.strokeStyle = "#28a745";
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(
            Math.min(corteInicio.x, corteFim.x),
            Math.min(corteInicio.y, corteFim.y),
            Math.abs(corteFim.x - corteInicio.x),
            Math.abs(corteFim.y - corteInicio.y)
        );
        ctx.restore();
    }
}

function ativarCorte(cardId) {
    const canvas = document.getElementById(`canvas-editor-${cardId}`);
    if (!canvas) return;
    if (!imagemOriginalEditor || !imagemOriginalEditor.complete) {
        alert("Aguarde a imagem carregar completamente antes de cortar.");
        return;
    }
    corteAtivo = true;
    corteCardIdAtual = cardId;
    corteInicio = null;
    corteFim = null;
    corteRetangulo = null;

    // Esconde o botão de aplicar corte até ter seleção
    const btnAplicar = document.getElementById(`btn-aplicar-corte-${cardId}`);
    if (btnAplicar) btnAplicar.style.display = "none";

    // Redesenha a imagem original
    desenharCorte(canvas);

    // Adiciona eventos de mouse
    canvas.style.cursor = "crosshair";
    let arrastando = false;

    canvas.onmousedown = (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = Math.round(
            (e.clientX - rect.left) * (canvas.width / rect.width)
        );
        const y = Math.round(
            (e.clientY - rect.top) * (canvas.height / rect.height)
        );

        // Verifica se clicou dentro da área de corte existente para movê-la
        if (
            corteRetangulo &&
            x >= corteRetangulo.x &&
            x <= corteRetangulo.x + corteRetangulo.w &&
            y >= corteRetangulo.y &&
            y <= corteRetangulo.y + corteRetangulo.h
        ) {
            // Mover área existente
            canvas.style.cursor = "move";
            arrastando = "mover";
            corteInicio = { x: x - corteRetangulo.x, y: y - corteRetangulo.y };
        } else {
            // Nova seleção
            corteInicio = { x, y };
            corteFim = null;
            corteRetangulo = null;
            arrastando = "selecionar";
            canvas.style.cursor = "crosshair";
        }
        console.log("Corte: mouse down", { x, y, arrastando });
    };

    canvas.onmousemove = (e) => {
        if (!corteInicio) return;
        const rect = canvas.getBoundingClientRect();
        const x = Math.round(
            (e.clientX - rect.left) * (canvas.width / rect.width)
        );
        const y = Math.round(
            (e.clientY - rect.top) * (canvas.height / rect.height)
        );

        if (arrastando === "mover" && corteRetangulo) {
            // Mover área existente
            corteRetangulo.x = Math.max(
                0,
                Math.min(canvas.width - corteRetangulo.w, x - corteInicio.x)
            );
            corteRetangulo.y = Math.max(
                0,
                Math.min(canvas.height - corteRetangulo.h, y - corteInicio.y)
            );
        } else if (arrastando === "selecionar") {
            // Nova seleção
            corteFim = { x, y };
        }

        desenharCorte(canvas);
    };

    canvas.onmouseup = (e) => {
        if (!corteInicio) return;
        const rect = canvas.getBoundingClientRect();
        const x = Math.round(
            (e.clientX - rect.left) * (canvas.width / rect.width)
        );
        const y = Math.round(
            (e.clientY - rect.top) * (canvas.height / rect.height)
        );

        if (arrastando === "selecionar") {
            corteFim = { x, y };
            corteRetangulo = {
                x: Math.min(corteInicio.x, corteFim.x),
                y: Math.min(corteInicio.y, corteFim.y),
                w: Math.abs(corteFim.x - corteInicio.x),
                h: Math.abs(corteFim.y - corteInicio.y),
            };
        }

        desenharCorte(canvas);
        canvas.style.cursor = "crosshair";
        arrastando = false;

        // Mostra botão se área válida
        const btnAplicar = document.getElementById(
            `btn-aplicar-corte-${cardId}`
        );
        if (
            btnAplicar &&
            corteRetangulo &&
            corteRetangulo.w > 10 &&
            corteRetangulo.h > 10
        ) {
            btnAplicar.style.display = "";
        } else if (btnAplicar) {
            btnAplicar.style.display = "none";
        }
        console.log("Corte: mouse up", corteRetangulo);
    };
}

function aplicarCorte(cardId) {
    if (!corteAtivo || corteCardIdAtual !== cardId || !corteRetangulo) return;
    const canvas = document.getElementById(`canvas-editor-${cardId}`);
    const ctx = canvas.getContext("2d");
    const { x, y, w, h } = corteRetangulo;
    if (w < 10 || h < 10) return; // Corte mínimo
    // Pega a imagem cortada da imagem original
    if (!imagemOriginalEditor) return;
    // Cria um canvas temporário para cortar
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = w;
    tempCanvas.height = h;
    const tempCtx = tempCanvas.getContext("2d");
    tempCtx.drawImage(imagemOriginalEditor, x, y, w, h, 0, 0, w, h);
    // Redimensiona o canvas principal
    canvas.width = w;
    canvas.height = h;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(tempCanvas, 0, 0);
    // Atualiza a imagem original para o novo corte
    imagemOriginalEditor = new Image();
    imagemOriginalEditor.src = canvas.toDataURL();
    // Limpa seleção
    corteAtivo = false;
    corteInicio = null;
    corteFim = null;
    corteRetangulo = null;
    corteCardIdAtual = null;
    canvas.style.cursor = "default";
    canvas.onmousedown = null;
    canvas.onmousemove = null;
    canvas.onmouseup = null;
    // Esconde botão de aplicar corte
    const btnAplicar = document.getElementById(`btn-aplicar-corte-${cardId}`);
    if (btnAplicar) btnAplicar.style.display = "none";
}
