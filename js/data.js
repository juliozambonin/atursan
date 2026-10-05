// Atrativos de Sananduva — textos para a ATURSAN revisar e completar.
// img: foto (preenche o card; pos: enquadramento, ex. 'center 80%') · logo: logotipo (exibido inteiro, sobre fundo claro)
// Sem img/logo, o card usa o emoji sobre o gradiente.
window.ATRATIVOS = [
  {
    id: 'igreja', area: 'Cidade', title: 'Igreja Matriz',
    emoji: '⛪', bg: 'linear-gradient(135deg,#f3dc8f,#e2b84f)',
    img: 'assets/img/igreja-matriz.png',
    short: 'O cartão-postal do centro, com sua torre e vitrais.',
    text: 'No coração da cidade, a igreja é o principal cartão-postal de Sananduva. A torre esguia, as janelas em arco com vitrais coloridos e o sino que marca o ritmo do centro fazem dela parada obrigatória para quem visita.'
  },
  {
    id: 'praca', area: 'Cidade', title: 'Praça da Sananduva',
    emoji: '🌳', bg: 'linear-gradient(135deg,#ff8a6b,#d7261e)',
    img: 'assets/img/arvore-sananduva.webp',
    short: 'Chimarrão à sombra da árvore que dá nome à cidade.',
    text: 'Um passeio pela praça, um chimarrão no banco e a árvore sananduva florida: o jeito mais simples (e mais gostoso) de sentir o ritmo da cidade.'
  },
  {
    id: 'artesao', area: 'Cidade', title: 'Casa do Artesão',
    emoji: '🧺', bg: 'linear-gradient(135deg,#f3c98e,#c4823f)',
    img: 'assets/img/casa-artesao.webp', pos: 'center 82%',
    short: 'Artesanato local num chalé de madeira na praça.',
    text: 'Na praça, um chalé de pinus envernizado reúne o trabalho dos artesãos da região: cestaria, cerâmica, tricô, madeira e lembranças feitas à mão em Sananduva.'
  },
  {
    id: 'pipinos', area: 'Cidade', title: "Pipino's Lanches",
    emoji: '🍔', bg: 'linear-gradient(135deg,#7fd08f,#2f8f4e)',
    logo: 'assets/img/parceiros/pipinos.webp',
    short: 'O legítimo xis prensado gaúcho.',
    text: "Pão prensado na chapa, recheio generoso e aquele jeito gaúcho de servir: o Pipino's é endereço certo para provar o xis de Sananduva, entre amigos e boa conversa."
  },
  {
    id: 'majestade', area: 'Cidade', title: 'Majestade',
    emoji: '🍖', icon: 'salame', bg: 'linear-gradient(135deg,#f6d34a,#d9952a)',
    img: 'assets/img/majestade.webp',
    short: 'Salames e embutidos famosos — e a árvore de salame.',
    text: 'O prédio amarelo da Majestade é um símbolo da indústria local. Daqui saem os salames e embutidos suínos que levam o nome de Sananduva para longe. Não deixe de tirar uma foto com a famosa árvore de salame, marca registrada do lugar.'
  },
  {
    id: 'vicato', area: 'Cidade', title: 'Vicato',
    emoji: '🌾', bg: 'linear-gradient(135deg,#f1e7c8,#c9b27a)',
    img: 'assets/img/vicato.webp',
    short: 'Farinha de trigo produzida na cidade.',
    text: 'A Vicato produz farinha de trigo em Sananduva. Do trigo colhido nas lavouras da região ao pão na mesa, ela faz parte da história produtiva do município.'
  },
  {
    id: 'vivaflor', area: 'Interior', title: 'Vivaflor — Produtos Naturais',
    emoji: '🐝', bg: 'linear-gradient(135deg,#fbe7a1,#e0a92a)',
    logo: 'assets/img/parceiros/vivaflor.png',
    short: 'Mel e produtos naturais, direto da mata florida.',
    text: 'Em meio a uma mata florida, as abelhas da Vivaflor trabalham sem parar. Daqui saem o mel e os produtos naturais, feitos com o cuidado de quem respeita o tempo da natureza.'
  },
  {
    id: 'elton', area: 'Interior', title: 'Elton',
    emoji: '🍇', bg: 'linear-gradient(135deg,#d9c3e6,#5b2a6e)',
    short: 'Sítio com parreiral e o micro-ônibus do Elton.',
    text: 'Um sítio com parreiral para colher uva no pé, em família, pertinho do Espaço Ágape. O micro-ônibus do Elton fica estacionado logo à frente.'
  },
  {
    id: 'kaskata', area: 'Interior', title: 'Camping Kaskata',
    emoji: '⛺', bg: 'linear-gradient(135deg,#9ad7f0,#3a8fb8)',
    logo: 'assets/img/parceiros/camping-kaskata.webp',
    short: 'Quedas d’água, rio e barracas sob as árvores.',
    text: 'Um rio que desce em quedas d’água entre pedras e mata — e, ao lado, espaço para armar a barraca, acender o fogo de chão e dormir ouvindo a cascata. Instagram: @camping_kaskata.'
  },
  {
    id: 'agape', area: 'Interior', title: 'Espaço Ágape',
    emoji: '🌄', bg: 'linear-gradient(135deg,#ffd59a,#f08a4b)',
    logo: 'assets/img/parceiros/espaco-agape.png',
    short: 'Terapias, vivências e retiros acima das nuvens.',
    text: 'No alto do morro, o sol nasce acima de um tapete de nuvens. O Espaço Ágape reúne terapias, vivências, espiritualidade e retiros — um convite para respirar fundo e se reconectar.'
  },
  {
    id: 'belusso', area: 'Interior', title: 'Belusso Steak House',
    emoji: '💍', bg: 'linear-gradient(135deg,#f7d9b5,#e89a4c)',
    logo: 'assets/img/parceiros/belusso.png',
    short: 'Carnes na brasa, pizza, hambúrguer e casamentos entre as árvores.',
    text: 'Cortes na brasa, um quiosque de pizza no forno a lenha e hambúrgueres, e um espaço bem arborizado, cercado de araucárias, perfeito para casamentos e celebrações ao ar livre.'
  },
  {
    id: 'angico', area: 'Interior', title: 'Pousada Angico',
    emoji: '🏡', bg: 'linear-gradient(135deg,#f1c98e,#c98a3f)',
    logo: 'assets/img/parceiros/pousada-angico.webp',
    short: 'Chalé de madeira suspenso, com fogueira à beira do riacho.',
    text: 'Um chalé único de madeira, com frontão de vidro suspenso sobre o barranco, à beira da estrada do interior e ao lado de um grande angico. Nos fundos, roda de fogo no firepit com o som do riacho. Silêncio, céu estrelado e o cheiro do mato ao amanhecer.'
  },
  {
    id: 'dallas', area: 'Interior', title: 'Dallas Animal',
    emoji: '🦆', bg: 'linear-gradient(135deg,#e9e9e9,#9a9a9a)',
    logo: 'assets/img/parceiros/dallas-animal.png',
    short: 'Lago com patinhos, carpas, coelhos e passarinhos.',
    text: 'Um lago tranquilo onde os patinhos passeiam em fila e as carpas saltam na água. Na grama, coelhos pulando; no céu, passarinhos voando em volta. Ótimo para levar as crianças e aproveitar a tarde.'
  },
  {
    id: 'moterle', area: 'Interior', title: 'Sítio Moterle JM',
    emoji: '🌲', bg: 'linear-gradient(135deg,#cfe6c0,#4f8a35)',
    logo: 'assets/img/parceiros/sitio-moterle.png',
    short: 'Natureza, lazer, família e bem-estar.',
    text: 'Um lago cercado de árvores para pescar com calma, pomar com frutas para colher no pé, sombra fresca e espaço para a família aproveitar o dia. O Sítio Moterle une natureza, lazer, família e bem-estar.'
  },
  {
    id: 'fracasso', area: 'Interior', title: 'Fazenda Fracasso',
    emoji: '🍓', bg: 'linear-gradient(135deg,#f6c6c0,#8b3a2a)',
    logo: 'assets/img/parceiros/fazenda-fracasso.webp',
    short: 'Café colonial e morangos colhidos nas estufas.',
    text: 'Café passado na hora, mesa farta e estufas de morangos em bancadas suspensas, para colher sem se abaixar. Ao lado, o trator com a charrete. A Fazenda Fracasso recebe com a hospitalidade do interior.'
  },
  {
    id: 'flora', area: 'Interior', title: 'Flora',
    emoji: '🕯️', bg: 'linear-gradient(135deg,#f7dbe4,#b9879a)',
    logo: 'assets/img/parceiros/flora.png',
    short: 'Yoga ao ar livre e velas perfumadas artesanais.',
    text: 'Práticas de yoga em um deck no meio do verde, com o aroma das velas perfumadas e dos produtos artesanais da Flora.'
  }
];
