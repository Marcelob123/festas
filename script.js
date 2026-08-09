let festas = JSON.parse(localStorage.getItem('festasAgendadas')) || [];
let catalogoServicos = JSON.parse(localStorage.getItem('catalogoServicos')) || [];
let catalogoCombos = JSON.parse(localStorage.getItem('catalogoCombos')) || [];
let clientesSalvos = JSON.parse(localStorage.getItem('clientesSalvos')) || []; 

let comboTempItens = [];
let pedidoAtualItens = [];

let dataAtual = new Date();
let mesAtual = dataAtual.getMonth();
let anoAtual = dataAtual.getFullYear();
let chartInstance = null;
let indexChecklistAtual = null;

function formatarMoeda(valor) { return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
function formatarDataCurta(data) { const p = data.split('-'); return p.length === 3 ? `${p[2]}/${p[1]}` : data; } 
function formatarDataCompleta(data) { const p = data.split('-'); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : data; } 

function mudarAba(idAba, idBotao) {
    document.querySelectorAll('.conteudo-aba').forEach(aba => aba.classList.remove('ativa'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('ativo'));
    document.getElementById(idAba).classList.add('ativa');
    document.getElementById(idBotao).classList.add('ativo');
    window.scrollTo(0, 0); 
    if(idAba === 'aba-agenda') renderizarCalendario(); 
}

function alternarTema() {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('modoEscuro', document.body.classList.contains('dark-mode'));
}
if (localStorage.getItem('modoEscuro') === 'true') document.body.classList.add('dark-mode');

function atualizarListaClientes() {
    const datalist = document.getElementById('lista-clientes-salvos');
    datalist.innerHTML = '';
    clientesSalvos.forEach(cliente => { datalist.innerHTML += `<option value="${cliente}">`; });
}
function salvarNovoCliente(nome) {
    if (!nome) return;
    if (!clientesSalvos.includes(nome)) {
        clientesSalvos.push(nome);
        localStorage.setItem('clientesSalvos', JSON.stringify(clientesSalvos));
        atualizarListaClientes();
    }
}

function exportarBackup() {
    const dados = { festas, catalogoServicos, catalogoCombos, clientesSalvos };
    const blob = new Blob([JSON.stringify(dados)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `Backup_FestasPRO_${new Date().toISOString().split('T')[0]}.json`;
    a.click(); URL.revokeObjectURL(url);
}

function importarBackup(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const dados = JSON.parse(e.target.result);
            if(dados.festas) localStorage.setItem('festasAgendadas', JSON.stringify(dados.festas));
            if(dados.catalogoServicos) localStorage.setItem('catalogoServicos', JSON.stringify(dados.catalogoServicos));
            if(dados.catalogoCombos) localStorage.setItem('catalogoCombos', JSON.stringify(dados.catalogoCombos));
            if(dados.clientesSalvos) localStorage.setItem('clientesSalvos', JSON.stringify(dados.clientesSalvos));
            alert('✅ Backup Restaurado com Sucesso!'); location.reload();
        } catch (error) { alert('❌ Erro no arquivo.'); }
    };
    reader.readAsText(file);
}

// Visão Geral com Filtro de Período
function atualizarVisaoGeral() {
    let totalPendente = 0, totalFaturamento = 0, totalCustos = 0, totalRecebido = 0;
    const lista = document.getElementById('lista-festas');
    lista.innerHTML = '';
    let dadosMensais = {};

    const filtroPeriodo = document.getElementById('filtro-periodo').value;
    const hoje = new Date();

    festas.sort((a, b) => new Date(a.data) - new Date(b.data)).forEach((festa, index) => {
        const valorTotal = Number(festa.valor || 0);
        const custo = Number(festa.custo || 0);
        const antecipacao = Number(festa.antecipacao || 0);
        
        // Se for lead/orçamento aberto, não soma no faturamento geral se preferir, ou soma se fechado. Vamos somar apenas se for confirmado ou considerar tudo:
        if (festa.status !== 'Orçamento') {
            totalFaturamento += valorTotal;
            totalCustos += custo;
            if (festa.status === 'Pago') {
                totalRecebido += valorTotal;
            } else {
                totalRecebido += antecipacao;
                totalPendente += (valorTotal - antecipacao); 
            }
        }

        // Filtro de período (Semana / Mês)
        if (festa.data) {
            const dataFesta = new Date(festa.data + 'T00:00:00');
            if (filtroPeriodo === 'semana') {
                const umDia = 24 * 60 * 60 * 1000;
                const diffDias = (dataFesta - hoje) / umDia;
                if (diffDias < 0 || diffDias > 7) return; // Pula se estiver fora da semana
            } else if (filtroPeriodo === 'mes') {
                if (dataFesta.getMonth() !== hoje.getMonth() || dataFesta.getFullYear() !== hoje.getFullYear()) return; // Pula se estiver fora do mês
            }
        }

        const mesAnoFesta = festa.data ? festa.data.substring(0, 7) : 'Sem Data';
        if (!dadosMensais[mesAnoFesta]) dadosMensais[mesAnoFesta] = { faturamento: 0, lucro: 0 };
        dadosMensais[mesAnoFesta].faturamento += valorTotal;
        dadosMensais[mesAnoFesta].lucro += (valorTotal - custo);

        let classeStatus = 'status-pendente';
        let statusDisplay = festa.status;
        if (festa.status === 'Pago') classeStatus = 'status-pago';
        else if (festa.status === 'Orçamento') classeStatus = 'status-lead';

        lista.innerHTML += `
            <tr>
                <td>${formatarDataCurta(festa.data)}</td>
                <td><strong>${festa.cliente}</strong></td>
                <td><span class="${classeStatus}" onclick="alternarStatus(${index})" style="cursor:pointer;">${statusDisplay}</span></td>
                <td>
                    <div style="display: flex;">
                        <button class="btn-check" onclick="abrirChecklist(${index})">✅</button>
                        <button class="btn-pdf" onclick="gerarPDF(${index})">📄</button>
                        <button class="btn-remover" onclick="excluirFesta(${index})">X</button>
                    </div>
                </td>
            </tr>`;
    });

    document.getElementById('total-valor').textContent = formatarMoeda(totalFaturamento);
    document.getElementById('total-custos').textContent = formatarMoeda(totalCustos);
    document.getElementById('total-lucro').textContent = formatarMoeda(totalFaturamento - totalCustos);
    document.getElementById('total-recebido').textContent = formatarMoeda(totalRecebido);
    document.getElementById('total-pendente').textContent = formatarMoeda(totalPendente);

    renderizarCalendario();
    renderizarGrafico(dadosMensais);
}

function renderizarGrafico(dadosMensais) {
    const ctx = document.getElementById('graficoDesempenho').getContext('2d');
    const labels = Object.keys(dadosMensais).sort();
    const dataFaturamento = labels.map(m => dadosMensais[m].faturamento);
    const dataLucro = labels.map(m => dadosMensais[m].lucro);

    const labelsAmigaveis = labels.map(l => {
        if(l === 'Sem Data') return l;
        const [ano, mes] = l.split('-'); return `${mes}/${ano}`;
    });

    if(chartInstance) chartInstance.destroy();
    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labelsAmigaveis,
            datasets: [
                { label: 'Faturamento', data: dataFaturamento, backgroundColor: '#3b82f6', borderRadius: 4 },
                { label: 'Lucro Líquido', data: dataLucro, backgroundColor: '#10b981', borderRadius: 4 }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
    });
}

function excluirFesta(index) {
    if(confirm('Excluir este registro?')) { festas.splice(index, 1); localStorage.setItem('festasAgendadas', JSON.stringify(festas)); atualizarVisaoGeral(); }
}
function alternarStatus(index) {
    const atual = festas[index].status;
    if (atual === 'Orçamento') festas[index].status = 'Pendente';
    else if (atual === 'Pendente') festas[index].status = 'Pago';
    else festas[index].status = 'Orçamento';
    localStorage.setItem('festasAgendadas', JSON.stringify(festas)); atualizarVisaoGeral();
}

// Checklist
function abrirChecklist(index) {
    indexChecklistAtual = index;
    const festa = festas[index];
    if (!festa.tarefas) festa.tarefas = [];
    document.getElementById('checklist-cliente-nome').textContent = `Cliente: ${festa.cliente}`;
    document.getElementById('modal-checklist').style.display = 'flex';
    renderizarTarefas();
}
function fecharModalChecklist() { document.getElementById('modal-checklist').style.display = 'none'; localStorage.setItem('festasAgendadas', JSON.stringify(festas)); }
function renderizarTarefas() {
    const ul = document.getElementById('lista-tarefas'); ul.innerHTML = '';
    festas[indexChecklistAtual].tarefas.forEach((tarefa, idx) => {
        ul.innerHTML += `
            <li class="tarefa-item ${tarefa.concluida ? 'tarefa-feita' : ''}">
                <div><input type="checkbox" style="margin-right:8px" ${tarefa.concluida ? 'checked' : ''} onchange="alternarTarefa(${idx})"><span>${tarefa.nome}</span></div>
                <button class="btn-remover" onclick="removerTarefa(${idx})">X</button>
            </li>`;
    });
}
function adicionarTarefa() {
    const input = document.getElementById('nova-tarefa-nome'); if(!input.value) return;
    festas[indexChecklistAtual].tarefas.push({ nome: input.value, concluida: false }); input.value = ''; renderizarTarefas();
}
function alternarTarefa(idx) { festas[indexChecklistAtual].tarefas[idx].concluida = !festas[indexChecklistAtual].tarefas[idx].concluida; renderizarTarefas(); }
function removerTarefa(idx) { festas[indexChecklistAtual].tarefas.splice(idx, 1); renderizarTarefas(); }

// Calendário
function renderizarCalendario() {
    document.getElementById('mes-ano-display').textContent = `${['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'][mesAtual]} ${anoAtual}`;
    const grid = document.getElementById('calendario-dias'); grid.innerHTML = '';
    ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].forEach(d => grid.innerHTML += `<div class="dia-semana">${d}</div>`);
    
    for (let i = 0; i < new Date(anoAtual, mesAtual, 1).getDay(); i++) grid.innerHTML += `<div class="dia vazio"></div>`;
    for (let i = 1; i <= new Date(anoAtual, mesAtual + 1, 0).getDate(); i++) {
        const dataFormatada = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const festa = festas.find(f => f.data === dataFormatada);
        if (festa) {
            let classeDia = 'dia-festa';
            if (festa.status === 'Pago') classeDia = 'dia-festa-pago';
            else if (festa.status === 'Orçamento') classeDia = 'dia-lead';
            grid.innerHTML += `<div class="dia ${classeDia}" onclick="alert('Festa: ${festa.cliente}\\nStatus: ${festa.status}\\nTotal: ${formatarMoeda(festa.valor)}')">${i}</div>`;
        } else {
            grid.innerHTML += `<div class="dia" onclick="abrirModalAgendamento('${dataFormatada}')">${i}</div>`;
        }
    }
}
function mudarMes(d) { mesAtual += d; if (mesAtual < 0) { mesAtual = 11; anoAtual--; } else if (mesAtual > 11) { mesAtual = 0; anoAtual++; } renderizarCalendario(); }

function abrirModalAgendamento(data) {
    document.getElementById('modal-data').value = data; document.getElementById('modal-data-titulo').textContent = `Agendar: ${formatarDataCompleta(data)}`;
    document.getElementById('modal-agendamento').style.display = 'flex';
}
function fecharModalAgendamento() { document.getElementById('modal-agendamento').style.display = 'none'; document.getElementById('modal-cliente').value = ''; document.getElementById('modal-valor').value = ''; document.getElementById('modal-antecipacao').value = ''; document.getElementById('modal-custo').value = ''; }

function salvarAgendamentoRapido() {
    const data = document.getElementById('modal-data').value, cliente = document.getElementById('modal-cliente').value;
    const valor = parseFloat(document.getElementById('modal-valor').value) || 0, antecipacao = parseFloat(document.getElementById('modal-antecipacao').value) || 0, custo = parseFloat(document.getElementById('modal-custo').value) || 0;
    if(!cliente || valor === 0) return alert("Preencha Nome e Valor!");

    const choque = festas.find(f => f.data === data);
    if(choque) {
        if(!confirm(`⚠️ ATENÇÃO: Já existe uma festa agendada para este dia (${choque.cliente}). Deseja realmente agendar outra?`)) return;
    }

    festas.push({ cliente, data, endereco: 'A definir', valor, custo, antecipacao, status: (antecipacao >= valor && valor > 0) ? 'Pago' : 'Pendente', itens: [{nome: 'Reserva de Data', valor}], tarefas: [] });
    salvarNovoCliente(cliente); localStorage.setItem('festasAgendadas', JSON.stringify(festas)); fecharModalAgendamento(); atualizarVisaoGeral();
}

// Catálogo com Foto de Referência
function atualizarInterfaceCatalogo() {
    const ulServicos = document.getElementById('lista-catalogo-servicos'); ulServicos.innerHTML = '';
    catalogoServicos.forEach((s, idx) => {
        ulServicos.innerHTML += `
            <li>
                <div class="produto-info"><span class="produto-nome">${s.nome}</span><span class="badge-preco">${formatarMoeda(s.valor)}</span></div>
                <button class="btn-icon-circular" onclick="removerServico(${idx})">🗑️</button>
            </li>`;
    });

    const selectCombo = document.getElementById('cat-combo-select-servico'); selectCombo.innerHTML = '<option value="">-- Escolher Serviço --</option>';
    catalogoServicos.forEach(s => { selectCombo.innerHTML += `<option value="${s.id}">${s.nome}</option>`; });

    const ulCombos = document.getElementById('lista-catalogo-combos'); ulCombos.innerHTML = '';
    catalogoCombos.forEach((c, idx) => {
        ulCombos.innerHTML += `
            <li>
                <div class="produto-info">
                    <span class="produto-nome">${c.nome}</span>
                    <span class="badge-preco">${formatarMoeda(c.valorVenda)}</span>
                    <span class="sub-itens">${c.itens.map(i => `${i.qtd}x ${i.nome}`).join(', ')}</span>
                    ${c.foto ? `<a href="${c.foto}" target="_blank" style="font-size:0.75rem; color:#7c3aed;">🖼️ Ver Foto de Referência</a>` : ''}
                </div>
                <button class="btn-icon-circular" onclick="removerCombo(${idx})">🗑️</button>
            </li>`;
    });

    const selectPedido = document.getElementById('ped-catalogo-select'); selectPedido.innerHTML = '<option value="">-- Buscar no Catálogo --</option>';
    if (catalogoCombos.length > 0) {
        selectPedido.innerHTML += '<optgroup label="📦 Combos Prontos">';
        catalogoCombos.forEach(c => selectPedido.innerHTML += `<option value="combo_${c.id}">${c.nome} (${formatarMoeda(c.valorVenda)})</option>`);
        selectPedido.innerHTML += '</optgroup>';
    }
    if (catalogoServicos.length > 0) {
        selectPedido.innerHTML += '<optgroup label="🔹 Serviços Avulsos">';
        catalogoServicos.forEach(s => selectPedido.innerHTML += `<option value="serv_${s.id}">${s.nome} (${formatarMoeda(s.valor)})</option>`);
        selectPedido.innerHTML += '</optgroup>';
    }
}

function salvarServico() {
    const nome = document.getElementById('cat-serv-nome').value, valor = parseFloat(document.getElementById('cat-serv-valor').value);
    if(!nome || isNaN(valor)) return alert('Preencha nome e valor!');
    catalogoServicos.push({ id: Date.now().toString(), nome, valor }); localStorage.setItem('catalogoServicos', JSON.stringify(catalogoServicos));
    document.getElementById('cat-serv-nome').value = ''; document.getElementById('cat-serv-valor').value = ''; atualizarInterfaceCatalogo();
}
function removerServico(idx) { catalogoServicos.splice(idx,1); localStorage.setItem('catalogoServicos', JSON.stringify(catalogoServicos)); atualizarInterfaceCatalogo(); }

function addServicoNoComboAtual() {
    const idServico = document.getElementById('cat-combo-select-servico').value, qtd = parseInt(document.getElementById('cat-combo-qtd').value);
    if(!idServico || isNaN(qtd) || qtd < 1) return alert('Selecione um serviço!');
    const servico = catalogoServicos.find(s => s.id === idServico);
    comboTempItens.push({ idServico, nome: servico.nome, qtd, custoUn: servico.valor }); renderComboTemp();
}
function renderComboTemp() {
    const ul = document.getElementById('lista-temp-combo'); ul.innerHTML = ''; let custoTotal = 0;
    comboTempItens.forEach((item, idx) => {
        custoTotal += (item.custoUn * item.qtd);
        ul.innerHTML += `<li><span>${item.qtd}x ${item.nome}</span> <button class="btn-remover" onclick="comboTempItens.splice(${idx},1); renderComboTemp();">X</button></li>`;
    });
    document.getElementById('cat-combo-valor').placeholder = `Preço Sugerido: R$ ${custoTotal.toFixed(2)}`;
}
function salvarComboFinal() {
    const nome = document.getElementById('cat-combo-nome').value;
    const foto = document.getElementById('cat-combo-foto').value;
    const valorVenda = parseFloat(document.getElementById('cat-combo-valor').value);
    if(!nome || isNaN(valorVenda) || comboTempItens.length === 0) return alert('Preencha dados do combo!');
    
    catalogoCombos.push({ id: Date.now().toString(), nome, foto, valorVenda, itens: [...comboTempItens] });
    localStorage.setItem('catalogoCombos', JSON.stringify(catalogoCombos));
    document.getElementById('cat-combo-nome').value = ''; document.getElementById('cat-combo-foto').value = ''; document.getElementById('cat-combo-valor').value = ''; comboTempItens = []; renderComboTemp(); atualizarInterfaceCatalogo();
}
function removerCombo(idx) { catalogoCombos.splice(idx,1); localStorage.setItem('catalogoCombos', JSON.stringify(catalogoCombos)); atualizarInterfaceCatalogo(); }

// Vender com Frete Automático e Leads
function addAoPedido() {
    const selecao = document.getElementById('ped-catalogo-select').value; if(!selecao) return;
    const [tipo, id] = selecao.split('_');
    if (tipo === 'serv') {
        const serv = catalogoServicos.find(s => s.id === id); pedidoAtualItens.push({ nome: serv.nome, valor: serv.valor, sub: '' });
    } else if (tipo === 'combo') {
        const combo = catalogoCombos.find(c => c.id === id);
        pedidoAtualItens.push({ nome: combo.nome, valor: combo.valorVenda, sub: combo.itens.map(i => `${i.qtd}x ${i.nome}`).join(', ') });
    }
    atualizarTelaPedido();
}

function atualizarTelaPedido() {
    const ul = document.getElementById('lista-pedido-atual'); ul.innerHTML = ''; let subtotal = 0;
    pedidoAtualItens.forEach((item, idx) => {
        subtotal += item.valor;
        ul.innerHTML += `
            <li>
                <div class="carrinho-info">
                    <span class="carrinho-nome">${item.nome}</span>
                    ${item.sub ? `<span class="sub-itens">${item.sub}</span>` : ''}
                    <span class="carrinho-preco">${formatarMoeda(item.valor)}</span>
                </div>
                <button class="btn-icon-circular" onclick="pedidoAtualItens.splice(${idx},1); atualizarTelaPedido();">🗑️</button>
            </li>`;
    });

    const frete = parseFloat(document.getElementById('ped-frete').value) || 0;
    const totalGeral = subtotal + frete;
    document.getElementById('ped-total-display').textContent = formatarMoeda(totalGeral);
    calcularRestantePedido();
}

function calcularRestantePedido() {
    const subtotal = pedidoAtualItens.reduce((acc, item) => acc + item.valor, 0);
    const frete = parseFloat(document.getElementById('ped-frete').value) || 0;
    const totalGeral = subtotal + frete;
    const antecipacao = parseFloat(document.getElementById('ped-antecipacao').value) || 0;
    let restante = totalGeral - antecipacao;
    if (restante < 0) restante = 0;
    document.getElementById('ped-restante-display').textContent = formatarMoeda(restante);
}

function salvarOrcamentoPendente() {
    processarFechamentoPedido('Orçamento');
}

function fecharPedido() {
    processarFechamentoPedido('Pendente');
}

function processarFechamentoPedido(statusInicial) {
    const cliente = document.getElementById('ped-cliente').value, data = document.getElementById('ped-data').value, endereco = document.getElementById('ped-endereco').value;
    const custoEstimado = parseFloat(document.getElementById('ped-custo').value) || 0, antecipacao = parseFloat(document.getElementById('ped-antecipacao').value) || 0;
    const frete = parseFloat(document.getElementById('ped-frete').value) || 0;

    if(!cliente || !data || pedidoAtualItens.length === 0) return alert('Preencha Cliente, Data e adicione itens!');

    const choque = festas.find(f => f.data === data);
    if(choque && statusInicial !== 'Orçamento') {
        if(!confirm(`⚠️ ATENÇÃO: Já existe uma festa agendada para este dia (${choque.cliente}). Deseja continuar?`)) return;
    }

    let subtotal = pedidoAtualItens.reduce((acc, item) => acc + item.valor, 0);
    let faturamentoTotal = subtotal + frete;
    if(frete > 0) pedidoAtualItens.push({ nome: 'Taxa de Entrega / Frete', valor: frete, sub: '' });

    let statusFinal = statusInicial;
    if(statusInicial !== 'Orçamento' && antecipacao >= faturamentoTotal && faturamentoTotal > 0) {
        statusFinal = 'Pago';
    }

    festas.push({ cliente, data, endereco, valor: faturamentoTotal, custo: custoEstimado, antecipacao, status: statusFinal, itens: [...pedidoAtualItens], tarefas: [] });
    
    salvarNovoCliente(cliente); localStorage.setItem('festasAgendadas', JSON.stringify(festas));
    
    document.getElementById('ped-cliente').value = ''; document.getElementById('ped-data').value = ''; document.getElementById('ped-endereco').value = '';
    document.getElementById('ped-custo').value = ''; document.getElementById('ped-antecipacao').value = ''; document.getElementById('ped-frete').value = '';
    pedidoAtualItens = []; atualizarTelaPedido();
    
    alert(statusFinal === 'Orçamento' ? '📋 Orçamento salvo com sucesso!' : '✅ Pedido Fechado com Sucesso!'); 
    atualizarVisaoGeral(); mudarAba('aba-lista', 'btn-tab-lista');
}

function gerarWhatsApp() {
    const cliente = document.getElementById('ped-cliente').value || 'Cliente';
    if(pedidoAtualItens.length === 0) return alert('Adicione itens!');
    let texto = `Olá, *${cliente}*! 🎉\nSeu orçamento detalhado:\n\n`;
    let subtotal = 0;
    pedidoAtualItens.forEach(i => { texto += `✅ *${i.nome}* - ${formatarMoeda(i.valor)}\n`; if (i.sub) texto += `   ↳ ${i.sub}\n`; subtotal += i.valor; });
    const frete = parseFloat(document.getElementById('ped-frete').value) || 0;
    const total = subtotal + frete;
    if(frete > 0) texto += `🚚 Frete/Entrega: ${formatarMoeda(frete)}\n`;
    const antecipacao = parseFloat(document.getElementById('ped-antecipacao').value) || 0;
    texto += `\n💰 *Total Geral: ${formatarMoeda(total)}*\n`;
    if(antecipacao > 0) { texto += `💳 Sinal: ${formatarMoeda(antecipacao)}\n`; texto += `⏳ Restante: ${formatarMoeda(total - antecipacao)}\n`; }
    texto += `\nFico à disposição! ✨`;
    navigator.clipboard.writeText(texto).then(() => alert('✅ Orçamento copiado para o WhatsApp!'));
}

function gerarPDF(index) {
    const f = festas[index];
    const itensHtml = (f.itens && f.itens.length > 0) ? f.itens.map(i => `<li style="margin-bottom:10px;padding:10px;background:#f9fafb;border-radius:4px;"><strong>${i.nome}</strong> - <span style="color:#6b21a8;">${formatarMoeda(i.valor)}</span>${i.sub ? `<br><small style="color:#666;">${i.sub}</small>` : ''}</li>`).join('') : `<li>Serviços combinados.</li>`;
    const vSinal = Number(f.antecipacao || 0), vTotal = Number(f.valor || 0), restante = vTotal - vSinal;
    const content = document.createElement('div');
    content.innerHTML = `<div style="padding:40px;font-family:sans-serif;color:#333;"><h1 style="color:#6b21a8;text-align:center;margin-bottom:10px;">🎉 Festas PRO</h1><h3 style="text-align:center;color:#666;margin-top:0;">Confirmação de Pedido</h3><hr style="border:1px solid #e9d5ff;margin:20px 0;"><p><strong>Cliente:</strong> ${f.cliente}</p><p><strong>Data:</strong> ${formatarDataCompleta(f.data)}</p><p><strong>Local:</strong> ${f.endereco || 'A definir'}</p><h3 style="margin-top:30px;color:#4c1d95;border-bottom:1px solid #ddd;padding-bottom:5px;">Itens:</h3><ul style="list-style-type:none;padding-left:0;">${itensHtml}</ul><hr style="border:1px dashed #d8b4fe;margin:30px 0;"><div style="text-align:right;"><h2 style="color:#581c87;margin-bottom:5px;">Total: ${formatarMoeda(vTotal)}</h2>${vSinal > 0 ? `<p>Sinal Pago: <strong>${formatarMoeda(vSinal)}</strong></p>` : ''}${f.status !== 'Pago' ? `<p style="color:#ef4444;">Falta Pagar: <strong>${formatarMoeda(restante)}</strong></p>` : ''}<p>Status: <strong>${f.status}</strong></p></div><br><br><br><div style="text-align:center;"><p>___________________________________</p><p style="color:#666;">Assinatura</p></div></div>`;
    html2pdf().set({ margin: 0, filename: `Pedido_${f.cliente.replace(/\s+/g, '_')}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } }).from(content).save();
}

atualizarListaClientes(); atualizarVisaoGeral(); atualizarInterfaceCatalogo();
