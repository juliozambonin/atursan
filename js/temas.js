// Temas do site: mudam sozinhos conforme a data (estações do hemisfério sul e datas festivas).
//
// Para criar um tema novo, acrescente um item em TEMAS:
//   id     — nome curto, usado no endereço (?tema=id), no CSS (classe tema-id no <html>) e no mapa (TEMA.e('id'))
//   nome   — como aparece no seletor
//   base   — (opcional) tema(s) usados por baixo (ex.: o Natal usa o verão; o Final de ano usa o Natal e o verão)
//   quando — função que recebe a data e diz se o tema vale nela
// A ordem é a prioridade: vale o primeiro tema cuja data bate (datas festivas antes das estações).
// Para conferir outra data, use ?data=AAAA-MM-DD no endereço (ou o campo de data do seletor).
(function () {
  const md = d => (d.getMonth() + 1) * 100 + d.getDate(); // 1225 = 25 de dezembro
  // entre(d, 1201, 106): de 1º/dez a 6/jan (atravessa a virada do ano)
  const entre = (d, de, ate) => { const x = md(d); return de <= ate ? x >= de && x <= ate : x >= de || x <= ate; };
  const dia = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());

  // domingo de Páscoa do ano (algoritmo de Meeus/Jones/Butcher)
  function pascoa(ano) {
    const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100, d = Math.floor(b / 4), e = b % 4;
    const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const n = h + l - 7 * m + 114;
    return new Date(ano, Math.floor(n / 31) - 1, (n % 31) + 1);
  }
  // dias entre a data e o domingo de Páscoa daquele ano (negativo = antes)
  const diasDaPascoa = d => Math.round((dia(d) - pascoa(d.getFullYear())) / 864e5);

  const TEMAS = [
    { id: 'anonovo', nome: 'Final de ano', base: ['natal', 'verao'], quando: d => entre(d, 1226, 102) }, // 26/dez a 2/jan: Natal + fogos
    { id: 'natal', nome: 'Natal', base: 'verao', quando: d => entre(d, 1201, 106) },              // 1º/dez a 6/jan (Reis)
    { id: 'pascoa', nome: 'Páscoa', base: 'outono', quando: d => { const k = diasDaPascoa(d); return k >= -14 && k <= 1; } }, // 2 semanas antes até a segunda-feira
    { id: 'farroupilha', nome: 'Semana Farroupilha', quando: d => entre(d, 914, 920) },       // 14 a 20/set (20 = Dia do Gaúcho)
    { id: 'primavera', nome: 'Primavera', quando: d => entre(d, 923, 1220) },
    { id: 'outono', nome: 'Outono', quando: d => entre(d, 320, 620) },
    { id: 'inverno', nome: 'Inverno', quando: d => entre(d, 621, 922) },
    { id: 'verao', nome: 'Verão', quando: () => true }                                           // padrão
  ];

  // seletor para a associação validar os temas (troque para false para esconder)
  const MOSTRAR_SELETOR = true;

  let escolhido = null, dataSim = null;
  try {
    const q = new URLSearchParams(location.search);
    escolhido = q.get('tema');
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(q.get('data') || '');
    if (m) dataSim = new Date(+m[1], +m[2] - 1, +m[3]);
  } catch (e) { /* sem parâmetros */ }
  const agora = dataSim || new Date();
  const doDia = TEMAS.find(t => t.quando(agora));
  const tema = TEMAS.find(t => t.id === escolhido) || doDia;
  const bases = [].concat(tema.base || []);

  window.TEMAS = TEMAS;
  window.TEMA = {
    id: tema.id, nome: tema.nome, bases, data: agora,
    // TEMA.e('natal') vale no Natal e no Final de ano (que usa o Natal como base)
    e: id => id === tema.id || bases.includes(id),
    // domingo e segunda de Páscoa: o manto da cruz fica branco (Ressurreição)
    ressurreicao: [0, 1].includes(diasDaPascoa(agora))
  };
  for (const id of [tema.id, ...bases]) document.documentElement.classList.add('tema-' + id);

  if (!MOSTRAR_SELETOR) return;
  function seletor() {
    const box = document.createElement('div');
    box.className = 'tema-sel';
    const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const opts = [`<option value="">Automático (${dataSim ? 'em ' + agora.toLocaleDateString('pt-BR') : 'hoje'}: ${doDia.nome})</option>`]
      .concat(TEMAS.map(t => `<option value="${t.id}"${t.id === escolhido ? ' selected' : ''}>${t.nome}</option>`));
    box.innerHTML = `<label><span>Tema</span><select aria-label="Tema do site">${opts.join('')}</select></label>
      <label class="tema-data" title="Simular uma data (o tema automático segue esta data)"><span>Data</span><input type="date" aria-label="Simular data" value="${dataSim ? iso(dataSim) : ''}"></label>`;
    const go = (k, v) => {
      const u = new URL(location.href);
      if (v) u.searchParams.set(k, v); else u.searchParams.delete(k);
      if (k === 'data') u.searchParams.delete('tema'); // ao simular uma data, volta ao automático
      u.hash = 'explore'; // volta direto para o mapa
      location.href = u.toString();
    };
    box.querySelector('select').addEventListener('change', e => go('tema', e.target.value));
    box.querySelector('input').addEventListener('change', e => go('data', e.target.value));
    document.body.appendChild(box);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', seletor); else seletor();
})();
