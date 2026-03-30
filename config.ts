
export const CONFIG = {
  brandName: "ECLIN",
  portalTitle: "Portal da Qualidade",
  tagline: "Gestão Hospitalar & ONA",
  // Este é o e-mail que recebe os alertas de novos documentos
  notificationEmail: "qualidade@eclin.com.br",
  
  // Link para plataforma de assinatura
  signingPlatformUrl: "https://assinatura.eclin.com.br",

  // Áreas para documentos oficiais
  areas: [
    "Liderança Organizacional",
    "Gestão de Qualidade e Biossegurança",
    "Gestão Administrativa e Financeira",
    "Gestão de Pessoas",
    "Gestão de Suprimentos e Logística",
    "Gestão da Informação e Tecnologia",
    "Gestão da Comunicação e Marketing",
    "Engenharia Clínica",
    "Atendimento e Campo",
    "Assistência Técnica",
    "Adequações e Obras"
  ],

  // Mural Qualidade em Ação - Adicione novos posts aqui ou via interface administrativa
  muralPosts: [
    {
      id: '2',
      title: 'Treinamento SGQ ECLIN',
      content: 'Programe-se, no próximo dia 14 teremos o treinamento ONLINE do Sistema de Gestão da Qualidade da ECLIN, com atualizações para você aplicar no seu dia a dia!',
      date: '2026-04-14',
      image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=800'
    },
    {
      id: '1',
      title: 'Lançamento da Campanha Qualidade em Ação e nosso Mascote "Selo Azul"',
      content: 'Iniciamos hoje nossa nova nova campanha rumo à excelência na prestação de serviços para a Saúde. O mural será nosso ponto de encontro para novidades e conquistas da equipe ECLIN.',
      date: '2026-02-06',
      image: 'https://lh3.googleusercontent.com/d/1MHY3wc3GseX8pPFbzVDewqH7kaYDTWyD'
    }
  ],
  
  // Banner Principal - Para mudar as imagens, substitua as URLs abaixo.
  // Recomendamos o formato vertical (1080x1350) para melhor visualização no carrossel.
  // DICA: Para usar links do Google Drive, use o formato: 
  // https://lh3.googleusercontent.com/d/ID_DO_ARQUIVO
  carouselSlides: [
    {
      id: '1',
      image: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=1080&h=1350',
      title: 'Excelência ECLIN',
      subtitle: 'Rumo à acreditação ONA com precisão e segurança.'
    },
    {
      id: '2',
      image: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&q=80&w=1080&h=1350',
      title: 'Segurança do Paciente',
      subtitle: 'Nossos processos seguem os mais rígidos padrões internacionais.'
    },
    {
      id: '3',
      image: 'https://images.unsplash.com/photo-1551601651-2a8555f1a136?auto=format&fit=crop&q=80&w=1080&h=1350',
      title: 'Inovação em Saúde',
      subtitle: 'Tecnologia de ponta a serviço da vida.'
    }
  ],

  // Textos das abas
  tabs: {
    public: "Acervo",
    signed: "Homologados",
    upload: "Submeter"
  }
};
