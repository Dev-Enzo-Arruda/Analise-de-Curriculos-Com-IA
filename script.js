let vagaCount = 0;
let curriculoCount = 0;
let lastAnalysisData = null;

// --- INICIALIZAÇÃO E AUTENTICAÇÃO ---
window.addEventListener('DOMContentLoaded', () => {
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) {
        carregarSessao(savedKey);
    }
});

function fazerLogin() {
    const key = document.getElementById('loginKey').value.trim();
    if (!key) {
        alert("Por favor, informe uma chave válida.");
        return;
    }
    localStorage.setItem('gemini_api_key', key);
    carregarSessao(key);
}

function logout() {
    if (confirm("Deseja desconectar sua chave de API?")) {
        localStorage.removeItem('gemini_api_key');
        document.getElementById('loginScreen').style.display = 'block';
        document.getElementById('appScreen').style.display = 'none';
        document.getElementById('loginKey').value = '';
    }
}

function carregarSessao(key) {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appScreen').style.display = 'block';
    document.getElementById('keyMasked').innerText = key.substring(0, 6) + '...' + key.slice(-4);
    carregarDadosSalvos();
}

// --- GERENCIAMENTO DE ESTADO E PERSISTÊNCIA ---
function salvarEstado() {
    const vagas = [];
    document.querySelectorAll('#vagasContainer .dynamic-item').forEach(el => {
        vagas.push({
            titulo: el.querySelector('.vaga-titulo').value,
            qtd: el.querySelector('.vaga-qtd').value,
            desc: el.querySelector('.vaga-desc').value
        });
    });

    const curriculos = [];
    document.querySelectorAll('#curriculosContainer .dynamic-item').forEach(el => {
        curriculos.push({
            nome: el.querySelector('.curriculo-nome').value,
            texto: el.querySelector('.curriculo-texto').value
        });
    });

    localStorage.setItem('vagas_data', JSON.stringify(vagas));
    localStorage.setItem('curriculos_data', JSON.stringify(curriculos));
}

function carregarDadosSalvos() {
    document.getElementById('vagasContainer').innerHTML = '';
    document.getElementById('curriculosContainer').innerHTML = '';
    vagaCount = 0;
    curriculoCount = 0;

    const savedVagas = JSON.parse(localStorage.getItem('vagas_data') || '[]');
    const savedCurriculos = JSON.parse(localStorage.getItem('curriculos_data') || '[]');
    const savedResult = JSON.parse(localStorage.getItem('ultimo_resultado') || 'null');

    if (savedVagas.length > 0) {
        savedVagas.forEach(v => addVaga(v.titulo, v.qtd, v.desc));
    } else {
        addVaga();
    }

    if (savedCurriculos.length > 0) {
        savedCurriculos.forEach(c => addCurriculo(c.nome, c.texto));
    } else {
        addCurriculo();
        addCurriculo();
    }

    if (savedResult) {
        lastAnalysisData = savedResult;
        renderResultados(savedResult);
    }
}

function resetarDados() {
    if (confirm("Isso irá apagar todas as vagas, currículos e resultados salvos (sua Chave API continuará mantida). Confirmar?")) {
        localStorage.removeItem('vagas_data');
        localStorage.removeItem('curriculos_data');
        localStorage.removeItem('ultimo_resultado');
        document.getElementById('resultado').style.display = 'none';
        lastAnalysisData = null;
        carregarDadosSalvos();
    }
}

// --- ELEMENTOS DINÂMICOS ---
function addVaga(titulo = '', qtd = 1, desc = '') {
    vagaCount++;
    const div = document.createElement('div');
    div.className = 'dynamic-item';
    div.id = `vaga-${vagaCount}`;
    div.innerHTML = `
        <button type="button" class="btn-remove" onclick="removerElemento('vaga-${vagaCount}')">X</button>
        <label>Título da Vaga ${vagaCount}:</label>
        <input type="text" class="vaga-titulo" placeholder="Ex: Analista de Dados" value="${titulo}" oninput="salvarEstado()">
        <label>Posições Abertas:</label>
        <input type="number" class="vaga-qtd" value="${qtd}" min="1" oninput="salvarEstado()">
        <label>Requisitos:</label>
        <textarea class="vaga-desc" placeholder="Cole a descrição da vaga..." oninput="salvarEstado()">${desc}</textarea>
    `;
    document.getElementById('vagasContainer').appendChild(div);
    salvarEstado();
}

function addCurriculo(nome = '', texto = '') {
    curriculoCount++;
    const div = document.createElement('div');
    div.className = 'dynamic-item';
    div.id = `curriculo-${curriculoCount}`;
    div.innerHTML = `
        <button type="button" class="btn-remove" onclick="removerElemento('curriculo-${curriculoCount}')">X</button>
        <label>Nome do Candidato ${curriculoCount}:</label>
        <input type="text" class="curriculo-nome" placeholder="Ex: João da Silva" value="${nome}" oninput="salvarEstado()">
        <label>Currículo:</label>
        <textarea class="curriculo-texto" placeholder="Cole o texto do currículo..." oninput="salvarEstado()">${texto}</textarea>
    `;
    document.getElementById('curriculosContainer').appendChild(div);
    salvarEstado();
}

function removerElemento(id) {
    document.getElementById(id).remove();
    salvarEstado();
}

// --- PROCESSAMENTO COM GEMINI IA ---
async function processarAnalise() {
    const apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey) {
        alert("Sessão expirada. Faça login novamente.");
        logout();
        return;
    }

    const vagas = [];
    document.querySelectorAll('#vagasContainer .dynamic-item').forEach((el, idx) => {
        vagas.push({
            id: `vaga_${idx + 1}`,
            titulo: el.querySelector('.vaga-titulo').value,
            vagasAbertas: parseInt(el.querySelector('.vaga-qtd').value) || 1,
            descricao: el.querySelector('.vaga-desc').value
        });
    });

    const curriculos = [];
    document.querySelectorAll('#curriculosContainer .dynamic-item').forEach((el, idx) => {
        curriculos.push({
            id: `cand_${idx + 1}`,
            nome: el.querySelector('.curriculo-nome').value,
            texto: el.querySelector('.curriculo-texto').value
        });
    });

    const loading = document.getElementById('loading');
    const resultadoDiv = document.getElementById('resultado');

    loading.style.display = 'block';
    resultadoDiv.style.display = 'none';

    const promptSystem = `Você é um algoritmo de RH. Compare múltiplos currículos contra múltiplas vagas.
Analise a experiência (Categorias: "Identica", "Proxima" ou "Sem Correlacao").
Destaque capacitações extras (diferenciais não requisitados na vaga).
Defina os candidatos aprovados limitando-se exatamente à quantidade de vagas abertas.
Forneça uma recomendação cruzada global orientando a melhor alocação.

Responda ESTRITAMENTE em formato JSON com esta estrutura:
{
  "analisePorVaga": [
    {
      "tituloVaga": "string",
      "vagasAbertas": 1,
      "candidatosAprovados": ["Nome"],
      "candidatosAvaliados": [
        {
          "nomeCandidato": "string",
          "notaCompatibilidade": 85,
          "tipoExperiencia": "Identica | Proxima | Sem Correlacao",
          "comentarioExperiencia": "string",
          "diferenciais": ["string"],
          "comentarioGeral": "string"
        }
      ]
    }
  ],
  "recomendacaoCruzadaGlobal": "string"
}`;

    const inputUser = `VAGAS:\n${JSON.stringify(vagas)}\n\nCURRÍCULOS:\n${JSON.stringify(curriculos)}`;

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: `${promptSystem}\n\n${inputUser}` }] }],
                generationConfig: { responseMimeType: "application/json" }
            })
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error.message);

        const textResponse = data.candidates[0].content.parts[0].text;
        const parsedData = JSON.parse(textResponse);
        
        lastAnalysisData = parsedData;
        localStorage.setItem('ultimo_resultado', JSON.stringify(parsedData));
        renderResultados(parsedData);

    } catch (err) {
        alert("Erro ao analisar: " + err.message);
    } finally {
        loading.style.display = 'none';
    }
}

// --- RENDERIZAÇÃO E EXPORTAÇÃO EXCEL ---
function renderResultados(data) {
    const container = document.getElementById('resultado');
    container.style.display = 'block';
    let html = `
        <div class="action-bar" style="margin-bottom: 20px;">
            <button class="btn btn-excel" onclick="exportarParaExcel()">📊 Exportar Relatório em Excel (.csv)</button>
        </div>
    `;

    if (data.recomendacaoCruzadaGlobal) {
        html += `
            <div class="global-box">
                <h3>💡 Estratégia de Alocação Cruzada</h3>
                <p style="margin-top:10px;">${data.recomendacaoCruzadaGlobal}</p>
            </div>
        `;
    }

    data.analisePorVaga.forEach(vaga => {
        html += `
            <div class="result-vaga">
                <h2>🎯 Vaga: ${vaga.tituloVaga} (${vaga.vagasAbertas} vaga/s)</h2>
                <p><strong>Aprovado(s):</strong> ${vaga.candidatosAprovados.join(', ') || 'Nenhum'}</p>
                <hr style="border-color:#334155; margin:15px 0;">
        `;

        vaga.candidatosAvaliados.forEach(cand => {
            const isAprovado = vaga.candidatosAprovados.includes(cand.nomeCandidato);
            let badgeClass = 'badge-sem';
            if (cand.tipoExperiencia === 'Identica') badgeClass = 'badge-identica';
            if (cand.tipoExperiencia === 'Proxima') badgeClass = 'badge-proxima';

            html += `
                <div class="candidato-card ${isAprovado ? 'aprovado' : ''}">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <h3>${cand.nomeCandidato} ${isAprovado ? '✅ (Selecionado)' : ''}</h3>
                        <span style="font-size:1.2rem; font-weight:bold; color:var(--accent);">${cand.notaCompatibilidade}% Match</span>
                    </div>
                    <p style="margin:10px 0;">
                        <strong>Experiência:</strong> <span class="badge ${badgeClass}">${cand.tipoExperiencia}</span> - ${cand.comentarioExperiencia}
                    </p>
                    ${cand.diferenciais && cand.diferenciais.length > 0 ? `
                        <p style="margin-bottom:10px;"><strong>Diferenciais:</strong><br>
                        ${cand.diferenciais.map(d => `<span class="tag-diferencial">+ ${d}</span>`).join('')}</p>
                    ` : ''}
                    <p style="color:var(--text-muted); font-size:0.9rem;"><strong>Análise:</strong> ${cand.comentarioGeral}</p>
                </div>
            `;
        });

        html += `</div>`;
    });

    container.innerHTML = html;
    container.scrollIntoView({ behavior: 'smooth' });
}

function exportarParaExcel() {
    if (!lastAnalysisData) {
        alert("Nenhum resultado disponível para exportação.");
        return;
    }

    let csvContent = "\uFEFFVaga;Vagas Abertas;Candidato;Match (%);Tipo Experiencia;Status;Diferenciais;Analise\n";

    lastAnalysisData.analisePorVaga.forEach(vaga => {
        vaga.candidatosAvaliados.forEach(cand => {
            const status = vaga.candidatosAprovados.includes(cand.nomeCandidato) ? "Aprovado" : "Não Selecionado";
            const diferenciais = cand.diferenciais ? cand.diferenciais.join(" | ") : "";
            const analiseLimpa = (cand.comentarioGeral || "").replace(/;/g, ",").replace(/\n/g, " ");

            csvContent += `"${vaga.tituloVaga}";"${vaga.vagasAbertas}";"${cand.nomeCandidato}";"${cand.notaCompatibilidade}%";"${cand.tipoExperiencia}";"${status}";"${diferenciais}";"${analiseLimpa}"\n`;
        });
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Relatorio_Triagem_Talentos_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}