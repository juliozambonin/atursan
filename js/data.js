// Atrativos de Sananduva — textos para a ATURSAN revisar e completar.
// img: foto (preenche o card; pos: enquadramento, ex. 'center 80%') · logo: logotipo (exibido inteiro, sobre fundo claro; logoBg: cor de fundo, se o logo não for branco)
// Sem img/logo, o card usa o emoji sobre o gradiente.
// text: resumo exibido ao abrir o local · instagram: só o usuário, sem @ (ex. 'camping_kaskata') · telefone: como deve aparecer, ex. '(54) 99999-9999'
// Campos de contato vazios aparecem como "a preencher".
window.ATRATIVOS = [
  {
    id: 'igreja', area: 'Cidade', title: 'Igreja Matriz',
    emoji: '⛪', bg: 'linear-gradient(135deg,#f3dc8f,#e2b84f)',
    img: 'assets/img/igreja-matriz.png',
    short: 'O cartão-postal do centro, com sua torre e vitrais.',
    text: 'Principal cartão-postal de Sananduva, no coração da cidade. Torre esguia, vitrais coloridos e o sino que marca o ritmo do centro.',
    instagram: '', telefone: ''
  },
  {
    id: 'praca', area: 'Cidade', title: 'Praça da Sananduva',
    emoji: '🌳', bg: 'linear-gradient(135deg,#ff8a6b,#d7261e)',
    img: 'assets/img/arvore-sananduva.webp',
    short: 'Chimarrão à sombra da árvore que dá nome à cidade.',
    text: 'A praça central, com a árvore sananduva que dá nome à cidade. Lugar de passeio, banco à sombra e chimarrão.',
    instagram: '', telefone: ''
  },
  {
    id: 'artesao', area: 'Cidade', title: 'Casa do Artesão',
    emoji: '🧺', bg: 'linear-gradient(135deg,#f3c98e,#c4823f)',
    img: 'assets/img/casa-artesao.webp', pos: 'center 82%',
    short: 'Artesanato local num chalé de madeira na praça.',
    text: 'Chalé de madeira na praça que reúne o trabalho dos artesãos da região: cestaria, cerâmica, tricô, madeira e lembranças feitas à mão.',
    instagram: '', telefone: ''
  },
  {
    id: 'pipinos', area: 'Cidade', title: "Pipino's Lanches",
    emoji: '🍔', bg: 'linear-gradient(135deg,#7fd08f,#2f8f4e)',
    logo: 'assets/img/parceiros/pipinos.webp',
    short: 'O legítimo xis prensado gaúcho.',
    text: 'Lancheria no centro da cidade, endereço certo para provar o legítimo xis prensado gaúcho.',
    instagram: '', telefone: ''
  },
  {
    id: 'majestade', area: 'Cidade', title: 'Majestade',
    emoji: '🍖', icon: 'salame', bg: 'linear-gradient(135deg,#f6d34a,#d9952a)',
    img: 'assets/img/majestade.webp',
    short: 'Salames e embutidos famosos — e a árvore de salame.',
    text: 'Indústria de salames e embutidos suínos, símbolo da produção local. Não deixe de tirar uma foto com a famosa árvore de salame.',
    instagram: '', telefone: ''
  },
  {
    id: 'vicato', area: 'Cidade', title: 'Vicato',
    emoji: '🌾', bg: 'linear-gradient(135deg,#f1e7c8,#c9b27a)',
    img: 'assets/img/vicato.webp',
    short: 'Farinha de trigo produzida na cidade.',
    text: 'Moinho que produz farinha de trigo em Sananduva, do trigo das lavouras da região ao pão na mesa.',
    instagram: '', telefone: ''
  },
  {
    id: 'vivaflor', area: 'Interior', title: 'Vivaflor — Produtos Naturais',
    emoji: '🐝', bg: 'linear-gradient(135deg,#fbe7a1,#e0a92a)',
    logo: 'assets/img/parceiros/vivaflor.png',
    short: 'Mel e produtos naturais, direto da mata florida.',
    text: 'Mel e produtos naturais, feitos em meio a uma mata florida, no tempo da natureza.',
    instagram: '', telefone: ''
  },
  {
    id: 'elton', area: 'Interior', title: 'Elton',
    emoji: '🍇', bg: 'linear-gradient(135deg,#d9c3e6,#5b2a6e)',
    short: 'Sítio com parreiral e o micro-ônibus do Elton.',
    text: 'Sítio com parreiral para colher uva no pé, em família, pertinho do Espaço Ágape.',
    instagram: '', telefone: ''
  },
  {
    id: 'kaskata', area: 'Interior', title: 'Camping Kaskata',
    emoji: '⛺', bg: 'linear-gradient(135deg,#9ad7f0,#3a8fb8)',
    logo: 'assets/img/parceiros/camping-kaskata.webp',
    short: 'Quedas d’água, rio e barracas sob as árvores.',
    text: 'Camping à beira de um rio com quedas d’água entre pedras e mata. Barraca, fogo de chão e o som da cascata.',
    instagram: 'camping_kaskata', telefone: '(54) 99981-8354'
  },
  {
    id: 'agape', area: 'Interior', title: 'Espaço Ágape',
    emoji: '🌄', bg: 'linear-gradient(135deg,#ffd59a,#f08a4b)',
    logo: 'assets/img/parceiros/espaco-agape.png',
    short: 'Terapias, vivências e retiros acima das nuvens.',
    text: 'No alto do morro, acima de um tapete de nuvens: terapias, vivências, espiritualidade e retiros.',
    instagram: '', telefone: ''
  },
  {
    id: 'belusso', area: 'Interior', title: 'Belusso Steak House',
    emoji: '💍', bg: 'linear-gradient(135deg,#f7d9b5,#e89a4c)',
    logo: 'assets/img/parceiros/belusso.png',
    short: 'Carnes na brasa, pizza, bocha e casamentos entre as árvores.',
    text: 'Carnes na brasa, pizza no forno a lenha e hambúrguer, num espaço arborizado com lago, cancha de bocha e área para casamentos ao ar livre.',
    instagram: '', telefone: ''
  },
  {
    id: 'angico', area: 'Interior', title: 'Pousada Angico',
    emoji: '🏡', bg: 'linear-gradient(135deg,#f1c98e,#c98a3f)',
    logo: 'assets/img/parceiros/pousada-angico.webp',
    short: 'Chalé de madeira suspenso, com fogueira à beira do riacho.',
    text: 'Chalé de madeira suspenso, à beira da estrada do interior e ao lado de um grande angico. Fogueira no firepit com o som do riacho.',
    instagram: '', telefone: ''
  },
  {
    id: 'dallas', area: 'Interior', title: 'Dallas Animal',
    emoji: '🦆', bg: 'linear-gradient(135deg,#e9e9e9,#9a9a9a)',
    logo: 'assets/img/parceiros/dallas-animal.png',
    short: 'Lago com patinhos, carpas, coelhos e passarinhos.',
    text: 'Lago com patinhos e carpas, coelhos na grama e passarinhos em volta. Ótimo para levar as crianças.',
    instagram: '', telefone: ''
  },
  {
    id: 'moterle', area: 'Interior', title: 'Sítio Moterle JM',
    emoji: '🌲', bg: 'linear-gradient(135deg,#cfe6c0,#4f8a35)',
    logo: 'assets/img/parceiros/sitio-moterle.png',
    short: 'Natureza, lazer, família e bem-estar.',
    text: 'Lago para pescar, pomar para colher frutas no pé e sombra para a família. Natureza, lazer e bem-estar.',
    instagram: '', telefone: ''
  },
  {
    id: 'fracasso', area: 'Interior', title: 'Fazenda Fracasso',
    emoji: '🍓', bg: 'linear-gradient(135deg,#f6c6c0,#8b3a2a)',
    logo: 'assets/img/parceiros/fazenda-fracasso.webp',
    short: 'Café colonial, morangos das estufas e lago com quiosque.',
    text: 'Café colonial e estufas de morango em bancadas suspensas, para colher sem se abaixar. Ao pé do morro, um lago com quiosque.',
    instagram: '', telefone: ''
  },
  {
    id: 'flora', area: 'Interior', title: 'Flora',
    emoji: '🕯️', bg: 'linear-gradient(135deg,#f7dbe4,#b9879a)',
    logo: 'assets/img/parceiros/flora.webp', logoBg: '#eee0c6',
    short: 'Yoga numa clareira cercada de árvores e produtos artesanais.',
    text: 'Yoga num deck em uma clareira cercada de árvores, velas perfumadas e produtos artesanais. Acesso por estrada de chão a partir da Vicato.',
    instagram: '', telefone: ''
  }
];
