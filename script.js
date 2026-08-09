let festas = JSON.parse(localStorage.getItem('festas_kenia_v1')) || [];
let catalogoServicos = JSON.parse(localStorage.getItem('serv_kenia_v1')) || [];
let catalogoCombos = JSON.parse(localStorage.getItem('combos_kenia_v1')) || [];
let clientesSalvos = JSON.parse(localStorage.getItem('cli_kenia_v1')) || []; 

let comboTempItens = [];
let pedidoAtualItens = [];
let gastosDetalhadosTemp = []; 
let editIndex = null; // Variável para rastrear se estamos editando uma festa

let dataAtual = new Date();
let mesAtual = dataAtual.getMonth();
let anoAtual = dataAtual.getFullYear();
let chartInstance = null;

function formatarMoeda(valor) { return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
function formatarDataCurta(data) { const p = data.split('-'); return p.length === 3 ? `${p[2]}/${p[1]}` : data; } 
function formatarDataCompleta(data) { const p = data.split('-'); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : data; } 

function mudarAba(idAba, idBotao) {
    document.querySelectorAll('.conteudo-aba').forEach(aba => aba.classList.remove('ativa'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('ativo'));
    document.getElementById(idAba).classList.add('ativa');
    document.getElementById(idBotao).classList.add('ativo');
    window.scrollTo(0, 0); 
    if(idAba === 'aba-agenda') renderizarCalendario(); 
    if(idAba === 'aba-historico') renderizarHistorico();
    
    // Resetar edição se sair da aba pedido antes de fechar
    if(idAba !== 'aba-pedido' && editIndex !== null) {
        editIndex = null;
        limparFormularioVenda();
        document.getElementById('titulo-vender').innerText = '🛒 Nova Venda / Fechar Pedido';
        document.getElementById('btn-fechar-pedido').innerText = '💰 Fechar Pedido';
    }
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
        localStorage.setItem('cli_kenia_v1', JSON.stringify(clientesSalvos));
        atualizarListaClientes();
    }
}

// ==========================================
// 1. EDIÇÃO DE FESTAS 
// ==========================================
function editarFesta(index) {
    editIndex = index;
    const f = festas[index];
    
    document.getElementById('ped-cliente').value = f.cliente;
    document.getElementById('ped-data').value = f.data;
    document.getElementById('ped-horario').value = f.horario || '';
    document.getElementById('ped-endereco').value = f.endereco || '';
    document.getElementById('ped-obs').value = f.obs || '';
    document.getElementById('ped-antecipacao').value = f.antecipacao > 0 ? f.antecipacao : '';

    // Extrair o frete se existir para não ficar duplicado na lista
    let freteVal = 0;
    pedidoAtualItens = f.itens.filter(i => {
        if(i.nome === 'Deslocamento/Frete' || i.nome === 'Taxa de Deslocamento / Frete') {
            freteVal = i.valor;
            return false;
        }
        return true;
    });
    document.getElementById('ped-frete').value = freteVal > 0 ? freteVal : '';
    
    gastosDetalhadosTemp = f.gastos ? [...f.gastos] : [];
    
    renderizarGastosTemp();
    atualizarTelaPedido();
    
    document.getElementById('titulo-vender').innerText = `✏️ Editando Festa: ${f.cliente}`;
    document.getElementById('btn-fechar-pedido').innerText = '💾 Atualizar Pedido';
    mudarAba('aba-pedido', 'btn-tab-pedido');
}

// ==========================================
// 2. GASTOS E LUCROS (MÓDULOS)
// ==========================================
function adicionarGastoDetalhado() {
    const nome = document.getElementById('gasto-nome').value;
    const qtd = parseFloat(document.getElementById('gasto-qtd').value) || 1;
    const valor = parseFloat(document.getElementById('gasto-valor').value) || 0;
    if(!nome || valor <= 0) return alert('Preencha o nome do gasto e valor!');
    
    gastosDetalhadosTemp.push({ nome, qtd, valor, total: qtd * valor });
    document.getElementById('gasto-nome').value = '';
    document.getElementById('gasto-qtd').value = '1';
    document.getElementById('gasto-valor').value = '';
    renderizarGastosTemp();
}

function renderizarGastosTemp() {
    const ul = document.getElementById('lista-gastos-detalhados');
    ul.innerHTML = '';
    gastosDetalhadosTemp.forEach((g, idx) => {
        ul.innerHTML += `<li><span>${g.qtd}x ${g.nome} = <strong>${formatarMoeda(g.total)}</strong></span> <button class="btn-remover" onclick="gastosDetalhadosTemp.splice(${idx},1); renderizarGastosTemp();">X</button></li>`;
    });
}

function abrirModalGastos() {
    const inputMes = document.getElementById('filtro-mes-relatorio').value;
    const ul = document.getElementById('lista-gastos-modal');
    ul.innerHTML = '';
    let total = 0;

    festas.forEach(f => {
        if(f.data && f.data.startsWith(inputMes) && f.gastos && f.gastos.length > 0) {
            ul.innerHTML += `<li style="background:#e9d5ff; font-weight:bold; justify-content:center; color:#581c87; border-radius: 4px; padding: 0.5rem; margin-top: 10px;">${f.cliente} - ${formatarDataCurta(f.data)}</li>`;
            f.gastos.forEach(g => {
                ul.innerHTML += `<li style="padding: 0.5rem; border-bottom: 1px solid #f3f4f6;"><span>${g.qtd}x ${g.nome}</span> <strong>${formatarMoeda(g.total)}</strong></li>`;
                total += g.total;
            });
        }
    });

    if(total === 0) {
        ul.innerHTML = '<li style="padding: 1rem; text-align: center;">Nenhum gasto registrado neste mês.</li>';
    } else {
        ul.innerHTML += `<li style="background:#fecdd3; color:#e11d48; justify-content:space-between; padding: 1rem; margin-top: 10px; border-radius: 8px;"><strong>Total Gasto:</strong> <strong>${formatarMoeda(total)}</strong></li>`;
    }
    
    document.getElementById('modal-gastos').style.display = 'flex';
}
function fecharModalGastos() { document.getElementById('modal-gastos').style.display = 'none'; }


// ==========================================
// 3. VISÃO GERAL, RELATÓRIO E CONTAS A RECEBER
// ==========================================
function atualizarVisaoGeral() {
    let totalPendente = 0, totalFaturamento = 0, totalCustos = 0, totalRecebido = 0;
    const lista = document.getElementById('lista-festas');
    const listaReceber = document.getElementById('lista-contas-receber');
    lista.innerHTML = '';
    listaReceber.innerHTML = '';
    let dadosMensais = {};

    const inputMes = document.getElementById('filtro-mes-relatorio');
    if (!inputMes.value) {
        const now = new Date();
        inputMes.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }
    const mesSelecionado = inputMes.value; 
    let fatMes = 0, custoMes = 0, qtdFestasMes = 0;

    festas.sort((a, b) => new Date(a.data) - new Date(b.data)).forEach((festa, index) => {
        const valorTotal = Number(festa.valor || 0);
        const custo = Number(festa.custo || 0);
        const antecipacao = Number(festa.antecipacao || 0);
        
        totalFaturamento += valorTotal;
        totalCustos += custo;
        
        if (festa.status === 'Pago') {
            totalRecebido += valorTotal;
        } else {
            totalRecebido += antecipacao;
            const falta = valorTotal - antecipacao;
            totalPendente += falta;
            
            // Popula lista de contas a receber
            if(falta > 0) {
                listaReceber.innerHTML += `
                <tr>
                    <td>${formatarDataCurta(festa.data)}</td>
                    <td><strong>${festa.cliente}</strong></td>
                    <td style="color:#ef4444; font-weight:bold;">${formatarMoeda(falta)}</td>
                    <td><button class="btn-sucesso" onclick="quitarFesta(${index})" style="padding:0.4rem; font-size:0.75rem;">Dar Baixa</button></td>
                </tr>`;
            }
        }

        if (festa.data && festa.data.startsWith(mesSelecionado)) {
            fatMes += valorTotal;
            custoMes += custo;
            qtdFestasMes++;
        }

        const mesAnoFesta = festa.data ? festa.data.substring(0, 7) : 'Sem Data';
        if (!dadosMensais[mesAnoFesta]) dadosMensais[mesAnoFesta] = { faturamento: 0, lucro: 0 };
        dadosMensais[mesAnoFesta].faturamento += valorTotal;
        dadosMensais[mesAnoFesta].lucro += (valorTotal - custo);

        const classeStatus = festa.status === 'Pago' ? 'status-pago' : 'status-pendente';

        lista.innerHTML += `
            <tr>
                <td>${formatarDataCurta(festa.data)}</td>
                <td><strong>${festa.cliente}</strong></td>
                <td><span class="${classeStatus}" onclick="alternarStatus(${index})" style="cursor:pointer;">${festa.status}</span></td>
                <td>
                    <button class="btn-editar" onclick="editarFesta(${index})" title="Editar">✏️</button>
                    <button class="btn-remover" onclick="excluirFesta(${index})">X</button>
                </td>
            </tr>`;
    });
    
    if(listaReceber.innerHTML === '') listaReceber.innerHTML = '<tr><td colspan="4" style="text-align:center;">Nenhuma conta pendente.</td></tr>';

    document.getElementById('total-valor').textContent = formatarMoeda(totalFaturamento);
    document.getElementById('total-custos').textContent = formatarMoeda(totalCustos);
    document.getElementById('total-lucro').textContent = formatarMoeda(totalFaturamento - totalCustos);
    document.getElementById('total-recebido').textContent = formatarMoeda(totalRecebido);
    document.getElementById('total-pendente').textContent = formatarMoeda(totalPendente);

    const lucroMes = fatMes - custoMes;
    let notificacao = qtdFestasMes === 0 ? '⚠️ Nenhuma festa neste mês.' : `✨ Você tem ${qtdFestasMes} evento(s).`;
    
    document.getElementById('texto-relatorio-mensal').innerHTML = `
        <strong>Resumo de ${mesSelecionado.split('-').reverse().join('/')}:</strong><br>
        • Faturado: <b>${formatarMoeda(fatMes)}</b><br>
        • Gastos: <b style="color:#ef4444">${formatarMoeda(custoMes)}</b><br>
        • Lucro Líquido: <b style="color:#059669">${formatarMoeda(lucroMes)}</b><br>
        <span style="color:#7c3aed; display:block; margin-top:4px;"><b>Aviso:</b> ${notificacao}</span>
    `;

    renderizarCalendario();
    renderizarGrafico(dadosMensais);
}

function quitarFesta(index) {
    if(confirm(`Confirmar o recebimento total e dar baixa na festa de ${festas[index].cliente}?`)){
        festas[index].antecipacao = festas[index].valor;
        festas[index].status = 'Pago';
        localStorage.setItem('festas_kenia_v1', JSON.stringify(festas));
        atualizarVisaoGeral(); renderizarHistorico();
    }
}

function renderizarGrafico(dadosMensais) {
    const ctx = document.getElementById('graficoDesempenho').getContext('2d');
    const labels = Object.keys(dadosMensais).sort();
    const dataFaturamento = labels.map(m => dadosMensais[m].faturamento);
    const dataLucro = labels.map(m => dadosMensais[m].lucro);
    const labelsAmigaveis = labels.map(l => l === 'Sem Data' ? l : `${l.split('-')[1]}/${l.split('-')[0]}`);

    if(chartInstance) chartInstance.destroy();
    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labelsAmigaveis,
            datasets: [
                { label: 'Faturamento', data: dataFaturamento, backgroundColor: '#3b82f6', borderRadius: 4 },
                { label: 'Lucro', data: dataLucro, backgroundColor: '#10b981', borderRadius: 4 }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function alternarStatus(index) {
    festas[index].status = festas[index].status === 'Pendente' ? 'Pago' : 'Pendente';
    localStorage.setItem('festas_kenia_v1', JSON.stringify(festas)); 
    atualizarVisaoGeral(); renderizarHistorico();
}

function excluirFesta(index) {
    if(confirm('Tem certeza que deseja excluir?')) { 
        festas.splice(index, 1); 
        localStorage.setItem('festas_kenia_v1', JSON.stringify(festas)); 
        atualizarVisaoGeral(); renderizarHistorico(); 
    }
}

// ==========================================
// 4. HISTÓRICO
// ==========================================
function renderizarHistorico() {
    const tbody = document.getElementById('lista-historico');
    tbody.innerHTML = '';
    
    festas.sort((a, b) => new Date(b.data) - new Date(a.data)).forEach((festa, index) => {
        const classeStatus = festa.status === 'Pago' ? 'status-pago' : 'status-pendente';
        tbody.innerHTML += `
            <tr>
                <td>${formatarDataCurta(festa.data)}</td>
                <td><strong>${festa.cliente}</strong></td>
                <td><span class="${classeStatus}" onclick="alternarStatus(${index})" style="cursor:pointer;">${festa.status}</span></td>
                <td>
                    <button class="btn-editar" onclick="editarFesta(${index})" title="Editar">✏️</button>
                    <button class="btn-pdf" onclick="abrirDetalhesFesta(${index})" title="Ver Relatório">📄</button>
                </td>
            </tr>`;
    });
}

function abrirDetalhesFesta(index) {
    const f = festas[index];
    const lucro = f.valor - f.custo;
    
    let htmlItens = f.itens && f.itens.length > 0 ? f.itens.map(i => `<li>- ${i.nome}: ${formatarMoeda(i.valor)}</li>`).join('') : '<li>Nenhum item registrado.</li>';
    let htmlGastos = f.gastos && f.gastos.length > 0 ? f.gastos.map(g => `<li>- ${g.qtd}x ${g.nome}: <span style="color:#ef4444">${formatarMoeda(g.total)}</span></li>`).join('') : '<li>Nenhum gasto registrado.</li>';

    document.getElementById('detalhes-festa-conteudo').innerHTML = `
        <p><strong>👤 Cliente:</strong> ${f.cliente}</p>
        <p><strong>📅 Data e Hora:</strong> ${formatarDataCompleta(f.data)} às ${f.horario || 'Não definido'}</p>
        <p><strong>📍 Local:</strong> ${f.endereco || 'Não definido'}</p>
        <p><strong>📝 Obs:</strong> ${f.obs || 'Nenhuma'}</p>
        <hr style="margin: 10px 0; border: 0; border-top: 1px dashed #d8b4fe;">
        <h3 style="color:#2563eb; font-size:1rem;">🛒 Itens Vendidos</h3>
        <ul style="list-style:none; margin-bottom:10px;">${htmlItens}</ul>
        <h3 style="color:#ef4444; font-size:1rem;">📉 Gastos da Festa</h3>
        <ul style="list-style:none; margin-bottom:10px;">${htmlGastos}</ul>
        <hr style="margin: 10px 0; border: 0; border-top: 1px dashed #d8b4fe;">
        <p><strong>💰 Faturamento:</strong> ${formatarMoeda(f.valor)}</p>
        <p><strong>💳 Adiantamento Pago:</strong> ${formatarMoeda(f.antecipacao)}</p>
        <p><strong>💸 Custo Total:</strong> <span style="color:#ef4444">${formatarMoeda(f.custo)}</span></p>
        <p style="font-size: 1.1rem; margin-top: 5px;"><strong>✨ Lucro Limpo:</strong> <span style="color:#059669">${formatarMoeda(lucro)}</span></p>
    `;
    document.getElementById('modal-detalhes-festa').style.display = 'flex';
}
function fecharModalDetalhes() { document.getElementById('modal-detalhes-festa').style.display = 'none'; }


// ==========================================
// 5. CALENDÁRIO
// ==========================================
function renderizarCalendario() {
    document.getElementById('mes-ano-display').textContent = `${['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'][mesAtual]} ${anoAtual}`;
    const grid = document.getElementById('calendario-dias'); grid.innerHTML = '';
    ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].forEach(d => grid.innerHTML += `<div class="dia-semana">${d}</div>`);
    
    for (let i = 0; i < new Date(anoAtual, mesAtual, 1).getDay(); i++) grid.innerHTML += `<div class="dia vazio"></div>`;
    
    for (let i = 1; i <= new Date(anoAtual, mesAtual + 1, 0).getDate(); i++) {
        const dataFormatada = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const festasDoDia = festas.filter(f => f.data === dataFormatada);
        
        if (festasDoDia.length > 0) {
            grid.innerHTML += `<div class="dia dia-com-festa" onclick="abrirModalDia('${dataFormatada}')">${i} <br><small>(${festasDoDia.length})</small></div>`;
        } else {
            grid.innerHTML += `<div class="dia" onclick="abrirModalDia('${dataFormatada}')">${i}</div>`;
        }
    }
}
function mudarMes(d) { mesAtual += d; if (mesAtual < 0) { mesAtual = 11; anoAtual--; } else if (mesAtual > 11) { mesAtual = 0; anoAtual++; } renderizarCalendario(); }

function abrirModalDia(data) {
    document.getElementById('modal-data').value = data;
    document.getElementById('modal-dia-titulo').textContent = `Eventos em: ${formatarDataCompleta(data)}`;
    
    const festasDoDia = festas.filter(f => f.data === data);
    const container = document.getElementById('container-festas-do-dia');
    container.innerHTML = '';

    if (festasDoDia.length > 0) {
        festasDoDia.forEach(f => {
            const indexReal = festas.indexOf(f);
            container.innerHTML += `
                <div style="background:#faf5ff; border:1px solid #d8b4fe; border-radius:6px; padding:0.6rem; margin-bottom:0.5rem; font-size:0.85rem; color:#333;">
                    <strong>${f.cliente}</strong> (${f.horario || 'Livre'})<br>
                    Status: <b>${f.status}</b> | Valor: ${formatarMoeda(f.valor)}<br>
                    <button class="btn-editar" onclick="editarFesta(${indexReal}); fecharModalDia();" style="margin-top:4px; padding: 0.3rem 0.6rem;">✏️ Editar</button>
                    <button class="btn-pdf" onclick="abrirDetalhesFesta(${indexReal}); fecharModalDia();" style="margin-top:4px; padding: 0.3rem 0.6rem;">📄 Relatório</button>
                </div>`;
        });
    } else {
        container.innerHTML = `<p style="font-size:0.85rem; color:#888;">Nenhuma festa neste dia.</p>`;
    }

    document.getElementById('modal-dia-festas').style.display = 'flex';
}
function fecharModalDia() { document.getElementById('modal-dia-festas').style.display = 'none'; }

function irParaVender() {
    const dataSelecionada = document.getElementById('modal-data').value;
    fecharModalDia();
    mudarAba('aba-pedido', 'btn-tab-pedido');
    document.getElementById('ped-data').value = dataSelecionada;
}

// ==========================================
// 6. CATÁLOGO
// ==========================================
function atualizarInterfaceCatalogo() {
    const ulServicos = document.getElementById('lista-catalogo-servicos'); ulServicos.innerHTML = '';
    catalogoServicos.forEach((s, idx) => {
        ulServicos.innerHTML += `<li><div class="produto-info"><span class="produto-nome">${s.nome}</span><span class="badge-preco">${formatarMoeda(s.valor)}</span></div><button class="btn-remover" onclick="removerServico(${idx})">X</button></li>`;
    });

    const selectCombo = document.getElementById('cat-combo-select-servico'); selectCombo.innerHTML = '<option value="">-- Serviço --</option>';
    catalogoServicos.forEach(s => { selectCombo.innerHTML += `<option value="${s.id}">${s.nome}</option>`; });

    const ulCombos = document.getElementById('lista-catalogo-combos'); ulCombos.innerHTML = '';
    catalogoCombos.forEach((c, idx) => {
        ulCombos.innerHTML += `<li><div class="produto-info"><span class="produto-nome">${c.nome}</span><span class="badge-preco">${formatarMoeda(c.valorVenda)}</span></div><button class="btn-remover" onclick="removerCombo(${idx})">X</button></li>`;
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
    if(!nome || isNaN(valor)) return;
    catalogoServicos.push({ id: Date.now().toString(), nome, valor }); localStorage.setItem('serv_kenia_v1', JSON.stringify(catalogoServicos));
    document.getElementById('cat-serv-nome').value = ''; document.getElementById('cat-serv-valor').value = ''; atualizarInterfaceCatalogo();
}
function removerServico(idx) { catalogoServicos.splice(idx,1); localStorage.setItem('serv_kenia_v1', JSON.stringify(catalogoServicos)); atualizarInterfaceCatalogo(); }

function addServicoNoComboAtual() {
    const idServico = document.getElementById('cat-combo-select-servico').value, qtd = parseInt(document.getElementById('cat-combo-qtd').value);
    if(!idServico) return;
    const servico = catalogoServicos.find(s => s.id === idServico);
    comboTempItens.push({ idServico, nome: servico.nome, qtd, custoUn: servico.valor }); renderComboTemp();
}
function renderComboTemp() {
    const ul = document.getElementById('lista-temp-combo'); ul.innerHTML = '';
    comboTempItens.forEach((item, idx) => { ul.innerHTML += `<li><span>${item.qtd}x ${item.nome}</span></li>`; });
}
function salvarComboFinal() {
    const nome = document.getElementById('cat-combo-nome').value, valorVenda = parseFloat(document.getElementById('cat-combo-valor').value);
    if(!nome || isNaN(valorVenda)) return;
    catalogoCombos.push({ id: Date.now().toString(), nome, valorVenda, itens: [...comboTempItens] });
    localStorage.setItem('combos_kenia_v1', JSON.stringify(catalogoCombos));
    document.getElementById('cat-combo-nome').value = ''; document.getElementById('cat-combo-valor').value = ''; comboTempItens = []; renderComboTemp(); atualizarInterfaceCatalogo();
}
function removerCombo(idx) { catalogoCombos.splice(idx,1); localStorage.setItem('combos_kenia_v1', JSON.stringify(catalogoCombos)); atualizarInterfaceCatalogo(); }

// ==========================================
// 7. VENDER / EDITAR 
// ==========================================
function addAoPedido() {
    const selecao = document.getElementById('ped-catalogo-select').value; if(!selecao) return;
    const [tipo, id] = selecao.split('_');
    if (tipo === 'serv') { 
        const serv = catalogoServicos.find(s => s.id === id); pedidoAtualItens.push({ nome: serv.nome, valor: serv.valor, sub: '' }); 
    } else { 
        const combo = catalogoCombos.find(c => c.id === id); pedidoAtualItens.push({ nome: combo.nome, valor: combo.valorVenda }); 
    }
    atualizarTelaPedido();
}

function atualizarTelaPedido() {
    const ul = document.getElementById('lista-pedido-atual'); ul.innerHTML = ''; let subtotal = 0;
    pedidoAtualItens.forEach((item, idx) => {
        subtotal += item.valor;
        ul.innerHTML += `<li><div class="carrinho-info"><span class="carrinho-nome">${item.nome}</span><span class="carrinho-preco">${formatarMoeda(item.valor)}</span></div><button class="btn-remover" onclick="pedidoAtualItens.splice(${idx},1); atualizarTelaPedido();">X</button></li>`;
    });

    const frete = parseFloat(document.getElementById('ped-frete').value) || 0;
    const totalGeral = subtotal + frete;
    document.getElementById('ped-total-display').textContent = formatarMoeda(totalGeral);
    
    const inputAnt = document.getElementById('ped-antecipacao');
    if (!inputAnt.value && totalGeral > 0 && editIndex === null) {
        inputAnt.value = (totalGeral / 2).toFixed(2);
    }
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

function fecharPedido() {
    const cliente = document.getElementById('ped-cliente').value;
    const data = document.getElementById('ped-data').value;
    const horario = document.getElementById('ped-horario').value;
    const endereco = document.getElementById('ped-endereco').value;
    const obs = document.getElementById('ped-obs').value;
    const frete = parseFloat(document.getElementById('ped-frete').value) || 0;
    const antecipacao = parseFloat(document.getElementById('ped-antecipacao').value) || 0;
    
    let custoEstimado = gastosDetalhadosTemp.reduce((acc, item) => acc + item.total, 0);

    if(!cliente || !data || pedidoAtualItens.length === 0) return alert('Preencha Cliente, Data e adicione itens!');

    let faturamentoTotal = pedidoAtualItens.reduce((acc, item) => acc + item.valor, 0) + frete;
    let itensFinais = [...pedidoAtualItens];
    if(frete > 0) itensFinais.push({ nome: 'Deslocamento/Frete', valor: frete });

    const statusFinal = (antecipacao >= faturamentoTotal && faturamentoTotal > 0) ? 'Pago' : 'Pendente';

    const novaFesta = { 
        cliente, data, horario, endereco, obs, 
        valor: faturamentoTotal, custo: custoEstimado, antecipacao, 
        status: statusFinal, 
        itens: itensFinais, gastos: [...gastosDetalhadosTemp]
    };

    if(editIndex !== null) {
        festas[editIndex] = novaFesta;
        alert('💾 Pedido Atualizado com Sucesso!'); 
    } else {
        festas.push(novaFesta);
        alert('✅ Novo Pedido Fechado!'); 
    }
    
    localStorage.setItem('festas_kenia_v1', JSON.stringify(festas));
    salvarNovoCliente(cliente);
    
    limparFormularioVenda();
    editIndex = null;
    document.getElementById('titulo-vender').innerText = '🛒 Nova Venda / Fechar Pedido';
    document.getElementById('btn-fechar-pedido').innerText = '💰 Salvar Pedido';

    atualizarVisaoGeral(); renderizarHistorico(); mudarAba('aba-lista', 'btn-tab-lista');
}

function limparFormularioVenda() {
    document.getElementById('ped-cliente').value = ''; document.getElementById('ped-data').value = ''; 
    document.getElementById('ped-endereco').value = ''; document.getElementById('ped-obs').value = '';
    document.getElementById('ped-antecipacao').value = ''; document.getElementById('ped-frete').value = '';
    pedidoAtualItens = []; gastosDetalhadosTemp = []; renderizarGastosTemp(); atualizarTelaPedido();
}

function gerarWhatsApp() {
    const cliente = document.getElementById('ped-cliente').value || 'Cliente';
    if(pedidoAtualItens.length === 0) return alert('Adicione itens!');
    let texto = `Olá, *${cliente}*! 🎉\nSeu pedido com *Kenia Silva_arte_festas*:\n\n`;
    let subtotal = 0;
    pedidoAtualItens.forEach(i => { texto += `✅ *${i.nome}* - ${formatarMoeda(i.valor)}\n`; subtotal += i.valor; });
    const frete = parseFloat(document.getElementById('ped-frete').value) || 0;
    const total = subtotal + frete;
    if(frete > 0) texto += `🚚 Deslocamento/Frete: ${formatarMoeda(frete)}\n`;
    const antecipacao = parseFloat(document.getElementById('ped-antecipacao').value) || 0;
    texto += `\n💰 *Total Geral: ${formatarMoeda(total)}*\n`;
    if(antecipacao > 0) { texto += `💳 Sinal: ${formatarMoeda(antecipacao)}\n`; texto += `⏳ Restante: ${formatarMoeda(total - antecipacao)}\n`; }
    navigator.clipboard.writeText(texto).then(() => alert('✅ Orçamento copiado!'));
}

function exportarBackup() {
    const dados = { festas, catalogoServicos, catalogoCombos, clientesSalvos };
    const blob = new Blob([JSON.stringify(dados)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `Backup_KeniaFestas_${new Date().toISOString().split('T')[0]}.json`;
    a.click(); URL.revokeObjectURL(url);
}

function importarBackup(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const dados = JSON.parse(e.target.result);
            if(dados.festas) localStorage.setItem('festas_kenia_v1', JSON.stringify(dados.festas));
            if(dados.catalogoServicos) localStorage.setItem('serv_kenia_v1', JSON.stringify(dados.catalogoServicos));
            if(dados.catalogoCombos) localStorage.setItem('combos_kenia_v1', JSON.stringify(dados.catalogoCombos));
            if(dados.clientesSalvos) localStorage.setItem('cli_kenia_v1', JSON.stringify(dados.clientesSalvos));
            alert('✅ Backup Restaurado com Sucesso!'); location.reload();
        } catch (error) { alert('❌ Erro no arquivo.'); }
    };
    reader.readAsText(file);
}

atualizarListaClientes(); atualizarVisaoGeral(); atualizarInterfaceCatalogo(); renderizarHistorico();
