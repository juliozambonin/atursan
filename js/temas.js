// Temas do site: mudam sozinhos conforme a data (estações do hemisfério sul e datas festivas).
//
// Para criar um tema novo, acrescente um item em TEMAS:
//   id     — nome curto, usado no endereço (?tema=id), no CSS (classe tema-id no <html>) e no mapa (TEMA.e('id'))
//   nome   — como aparece no seletor
//   base   — (opcional) estação usada por baixo do tema festivo (ex.: o Natal usa o visual de verão)
//   quando — função que recebe a data e diz se o tema vale nela
// A ordem é a prioridade: vale o primeiro tema cuja data bate (datas festivas antes das estações).
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
    { id: 'natal', nome: 'Natal', base: 'verao', quando: d => entre(d, 1201, 106) },              // 1º/dez a 6/jan (Reis)
    { id: 'pascoa', nome: 'Páscoa', base: 'outono', quando: d => { const k = diasDaPascoa(d); return k >= -14 && k <= 1; } }, // 2 semanas antes até a segunda-feira
    { id: 'primavera', nome: 'Primavera', quando: d => entre(d, 923, 1220) },
    { id: 'outono', nome: 'Outono', quando: d => entre(d, 320, 620) },
    { id: 'inverno', nome: 'Inverno', quando: d => entre(d, 621, 922) },
    { id: 'verao', nome: 'Verão', quando: () => true }                                           // padrão
  ];

  // seletor para a associação validar os temas (troque para false para esconder)
  const MOSTRAR_SELETOR = true;

  const hoje = TEMAS.find(t => t.quando(new Date()));
  let escolhido = null;
  try { escolhido = new URLSearchParams(location.search).get('tema'); } catch (e) { /* sem parâmetros */ }
  const tema = TEMAS.find(t => t.id === escolhido) || hoje;

  window.TEMAS = TEMAS;
  window.TEMA = {
    id: tema.id, nome: tema.nome, base: tema.base || tema.id, auto: tema === hoje && !escolhido,
    e: id => id === tema.id || id === tema.base // TEMA.e('outono') vale no outono e na Páscoa (que usa o outono como base)
  };
  document.documentElement.classList.add('tema-' + tema.id);
  if (tema.base) document.documentElement.classList.add('tema-' + tema.base);

  if (!MOSTRAR_SELETOR) return;
  function seletor() {
    const box = document.createElement('div');
    box.className = 'tema-sel';
    const opts = [`<option value="">Automático (hoje: ${hoje.nome})</option>`]
      .concat(TEMAS.map(t => `<option value="${t.id}"${t.id === escolhido ? ' selected' : ''}>${t.nome}</option>`));
    box.innerHTML = `<label><span>Tema</span><select aria-label="Tema do site">${opts.join('')}</select></label>`;
    box.querySelector('select').addEventListener('change', e => {
      const u = new URL(location.href);
      if (e.target.value) u.searchParams.set('tema', e.target.value); else u.searchParams.delete('tema');
      u.hash = 'explore'; // volta direto para o mapa
      location.href = u.toString();
    });
    document.body.appendChild(box);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', seletor); else seletor();
})();
