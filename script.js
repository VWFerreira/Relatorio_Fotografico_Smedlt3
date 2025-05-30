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
const storage = firebase.storage(); // ← NOVO: Firebase Storage

let formularios = [];
let idAtual = null;
let fotosTemporarias = new Map(); // Para armazenar arquivos antes do upload

window.onload = () => {
    carregarFormularios();
    configurarDragGlobal();
};

function configurarDragGlobal() {
    const fotosContainer = document.getElementById("fotos-container");

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

function carregarFormularios() {
    db.collection("formularios")
        .orderBy("timestamp", "desc")
        .limit(10)
        .get()
        .then((querySnapshot) => {
            formularios = [];
            querySnapshot.forEach((doc) => {
                formularios.push({ id: doc.id, ...doc.data() });
            });
            atualizarLista();
        })
        .catch((error) => {
            console.error("Erro ao carregar formulários:", error);
            formularios = [];
            atualizarLista();
        });
}

// NOVA FUNÇÃO: Upload de imagem para Storage
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

// NOVA FUNÇÃO: Deletar imagens do Storage
async function deleteImagesFromStorage(fotoPaths) {
    const deletePromises = fotoPaths.map(async (path) => {
        if (path) {
            try {
                await storage.ref(path).delete();
                console.log(`Imagem deletada: ${path}`);
            } catch (error) {
                console.warn(`Erro ao deletar imagem ${path}:`, error);
            }
        }
    });

    await Promise.all(deletePromises);
}

async function salvarFormulario() {
    const dados = {
        obra: document.getElementById("obra").value,
        local: document.getElementById("local").value,
        medicao: document.getElementById("medicao").value,
        empresa: document.getElementById("empresa").value,
        data: document.getElementById("data").value,
        fotos: [],
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    };

    if (!dados.obra.trim()) {
        alert("Preencha o campo OBRA antes de salvar.");
        return;
    }

    const docId = idAtual || Date.now().toString();

    // Mostra progresso
    const btnSalvar = document.querySelector(".btn-salvar");
    const textoOriginal = btnSalvar.textContent;
    btnSalvar.textContent = "⏳ Salvando...";
    btnSalvar.disabled = true;

    try {
        // Coleta todas as fotos dos cards
        const fotosCards = document.querySelectorAll(
            ".bloco-4-fotos .foto-card"
        );
        const totalFotos = fotosCards.length;
        let fotosProcessadas = 0;

        for (let i = 0; i < fotosCards.length; i++) {
            const card = fotosCards[i];
            const descricao = card.querySelector(
                "textarea[placeholder='Descrição do Serviço']"
            ).value;
            const img = card.querySelector("img");

            let fotoData = {
                descricao: descricao || "",
                url: null,
                path: null,
            };

            // Se tem imagem visível
            if (img && img.src && img.style.display !== "none") {
                // Verifica se é uma imagem nova (File) ou já salva (URL)
                const cardId = card.getAttribute("data-card-id") || `card_${i}`;
                const arquivo = fotosTemporarias.get(cardId);

                if (arquivo instanceof File) {
                    // É um arquivo novo, faz upload
                    const uploadResult = await uploadImageToStorage(
                        arquivo,
                        docId,
                        i
                    );
                    fotoData.url = uploadResult.url;
                    fotoData.path = uploadResult.path;
                } else if (img.src.startsWith("https://")) {
                    // É uma URL já salva, mantém
                    fotoData.url = img.src;
                    // Tenta recuperar o path se existir
                    const fotoExistente = formularios.find(
                        (f) => f.id === docId
                    )?.fotos?.[i];
                    fotoData.path = fotoExistente?.path || null;
                }
            }

            dados.fotos.push(fotoData);

            // Atualiza progresso
            fotosProcessadas++;
            btnSalvar.textContent = `⏳ ${fotosProcessadas}/${totalFotos} fotos`;
        }

        // Salva no Firestore
        await db.collection("formularios").doc(docId).set(dados);

        alert("Formulário salvo com sucesso!");
        idAtual = null;
        fotosTemporarias.clear(); // Limpa cache de arquivos
        carregarFormularios();
        limparFormulario();
    } catch (error) {
        alert("Erro ao salvar formulário: " + error.message);
        console.error("Erro detalhado:", error);
    } finally {
        // Restaura botão
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
    document.getElementById("fotos-container").innerHTML = "";
    fotosTemporarias.clear();
    idAtual = null;
}

function novoFormulario() {
    limparFormulario();
}

async function excluirFormulario(id) {
    if (confirm("Tem certeza que deseja excluir este formulário?")) {
        try {
            // Busca o formulário para pegar os paths das imagens
            const doc = await db.collection("formularios").doc(id).get();
            if (doc.exists) {
                const data = doc.data();
                const imagePaths =
                    data.fotos
                        ?.map((foto) => foto.path)
                        .filter((path) => path) || [];

                // Deleta as imagens do Storage
                if (imagePaths.length > 0) {
                    await deleteImagesFromStorage(imagePaths);
                }
            }

            // Deleta o documento do Firestore
            await db.collection("formularios").doc(id).delete();

            alert("Formulário excluído com sucesso!");
            carregarFormularios();
        } catch (error) {
            alert("Erro ao excluir formulário: " + error.message);
        }
    }
}

function atualizarLista() {
    const lista = document.getElementById("lista-formularios");
    lista.innerHTML = "";
    formularios.forEach((form) => {
        const li = document.createElement("li");
        li.className = "mb-3";

        const info = document.createElement("div");
        info.innerHTML = `<strong>${form.obra}</strong><br><small>${form.data}</small>`;

        const botoes = document.createElement("div");
        botoes.className = "d-flex gap-2 mt-2";

        const abrirBtn = document.createElement("button");
        abrirBtn.className = "btn btn-sm btn-success";
        abrirBtn.innerText = "Abrir";
        abrirBtn.onclick = () => abrirFormulario(form.id);

        const excluirBtn = document.createElement("button");
        excluirBtn.className = "btn btn-sm btn-danger";
        excluirBtn.innerText = "Excluir";
        excluirBtn.onclick = () => excluirFormulario(form.id);

        const imprimirBtn = document.createElement("button");
        imprimirBtn.className = "btn btn-sm btn-secondary";
        imprimirBtn.innerText = "Imprimir";
        imprimirBtn.onclick = () => {
            abrirFormulario(form.id);
            setTimeout(() => window.print(), 500);
        };

        botoes.appendChild(abrirBtn);
        botoes.appendChild(excluirBtn);
        botoes.appendChild(imprimirBtn);
        li.appendChild(info);
        li.appendChild(botoes);
        lista.appendChild(li);
    });
}

function abrirFormulario(id) {
    const form = formularios.find((f) => f.id === id);
    if (!form) return;

    // Preenche os campos básicos
    document.getElementById("obra").value = form.obra || "";
    document.getElementById("local").value = form.local || "";
    document.getElementById("medicao").value = form.medicao || "";
    document.getElementById("empresa").value = form.empresa || "ENGPAC";
    document.getElementById("data").value = form.data || "";

    // Limpa o container de fotos
    document.getElementById("fotos-container").innerHTML = "";
    fotosTemporarias.clear();

    // Carrega as fotos salvas
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
    let blocos = container.querySelectorAll(".bloco-4-fotos");
    let ultimoBloco = blocos[blocos.length - 1];

    if (!ultimoBloco || ultimoBloco.children.length >= 4) {
        ultimoBloco = document.createElement("div");
        ultimoBloco.className = "bloco-4-fotos";
        if (blocos.length > 0) ultimoBloco.classList.add("quebra-pagina");
        container.appendChild(ultimoBloco);
    }

    const card = document.createElement("div");
    card.className = "foto-card";

    // ID único para o card
    const finalCardId =
        cardId ||
        `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    card.setAttribute("data-card-id", finalCardId);

    const dropArea = document.createElement("div");
    dropArea.className = "drop-area";

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
            const img = dropArea.querySelector("img");
            previewFile(file, img, finalCardId);
        }
    });

    const descricaoInput = document.createElement("textarea");
    descricaoInput.rows = 2;
    descricaoInput.placeholder = "Descrição do Serviço";
    descricaoInput.className = "descricao-servico";
    descricaoInput.value = descricao;

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = false;
    const inputId = `upload-${Math.random().toString(36).substr(2, 9)}`;
    input.id = inputId;
    input.style.display = "none";

    const label = document.createElement("label");
    label.textContent = "Selecionar Imagem";
    label.className = "btn btn-sm btn-selecionar-imagem no-print";
    label.setAttribute("for", inputId);

    const btnExcluir = document.createElement("button");
    btnExcluir.textContent = "Excluir";
    btnExcluir.className = "btn btn-sm btn-excluir";
    btnExcluir.type = "button";
    btnExcluir.onclick = () => {
        fotosTemporarias.delete(finalCardId);
        card.remove();
    };

    const botoes = document.createElement("div");
    botoes.className = "d-flex gap-2 mt-2 mb-2 justify-content-center";
    botoes.appendChild(label);
    botoes.appendChild(btnExcluir);

    const img = document.createElement("img");
    img.style.display = "none";

    // Se tem imagem salva, carrega ela
    if (imagemSrc) {
        img.src = imagemSrc;
        img.style.display = "block";
        img.style.width = "100%";
        img.style.height = "auto";
        img.style.maxHeight = `${8 * 37.8}px`;
        img.style.objectFit = "contain";
        img.style.marginBottom = "10px";
    }

    input.addEventListener("change", () => {
        if (input.files.length > 0) {
            previewFile(input.files[0], img, finalCardId);
        }
    });

    dropArea.appendChild(descricaoInput);
    dropArea.appendChild(botoes);
    dropArea.appendChild(input);
    dropArea.appendChild(img);
    card.appendChild(dropArea);
    ultimoBloco.appendChild(card);
}

function adicionarFotos(arquivos = []) {
    if (arquivos.length === 0) {
        criarCardFoto();
        return;
    }

    arquivos = Array.from(arquivos);
    arquivos.forEach((arquivo) => {
        const cardId = `new_${Date.now()}_${Math.random()
            .toString(36)
            .substr(2, 9)}`;
        criarCardFoto("", null, cardId);

        // Pega o card recém-criado
        const card = document.querySelector(`[data-card-id="${cardId}"]`);
        const img = card.querySelector("img");

        // Preview do arquivo
        if (arquivo instanceof File) {
            previewFile(arquivo, img, cardId);
        }
    });
}

function previewFile(file, img, cardId) {
    // Armazena o arquivo para upload posterior
    fotosTemporarias.set(cardId, file);

    const reader = new FileReader();
    reader.onload = (e) => {
        img.onload = () => {
            img.style.display = "block";
            img.style.width = "100%";
            img.style.height = "auto";
            img.style.maxHeight = `${8 * 37.8}px`;
            img.style.objectFit = "contain";
            img.style.marginBottom = "10px";
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
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
}

document.addEventListener("input", function (event) {
    if (event.target.tagName.toLowerCase() === "textarea") {
        event.target.style.height = "auto";
        event.target.style.height = event.target.scrollHeight + 2 + "px";
    }
});

function ajustarAlturaTextareas() {
    document.querySelectorAll("textarea").forEach((el) => {
        el.style.height = "auto";
        el.style.height = el.scrollHeight + 2 + "px";
    });
}
