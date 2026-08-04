export interface TenantSummary {
  nome: string;
  nomeComercial?: string;
  corPrincipal?: string;
  presencaDigital?: { dominio?: string; site?: string; instagram?: string; whatsapp?: string };
  acessoLogin?: string;
  modulosAtivos: string[];
  claude: {
    habilitado: boolean;
    contaId?: string;
    modelosLiberados: string[];
    modeloChat: string;
    modeloGerador: string;
    limiteTokens: number;
  } | null;
  temSite: boolean;
}

export interface ModuleOption {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

export interface MetaInstagramSummary {
  igUserId?: string;
  tokenMasked?: string;
  obtidoEm?: string;
  renovacaoAutomatica?: boolean;
}

export interface OpenAISummary {
  apiKeyMasked?: string;
  obtidoEm?: string;
}

export interface PublicacaoFtpSummary {
  host?: string;
  porta?: number;
  usuario?: string;
  diretorioRemoto?: string;
  seguro?: boolean;
  temSenha?: boolean;
}

export interface PublicacaoSummary {
  metodo: "nenhum" | "ftp" | "git";
  ftp?: PublicacaoFtpSummary;
  git?: { repoUrl?: string; branch?: string };
  ultimaPublicacao?: { em: string; ok: boolean; mensagem: string };
}

export interface WordPressSummary {
  baseUrl?: string;
  usuario?: string;
  temSenha?: boolean;
  obtidoEm?: string;
}

export interface GoogleAdsSummary {
  customerId?: string;
  vinculadoEm?: string;
  /** false = credenciais globais (developer token/OAuth/refresh token) não
   * configuradas nesta instalação — nenhum cliente consegue aplicar campanha
   * de verdade até isso ser resolvido no .env.local. */
  instalado: boolean;
}

export interface ContaClaudeOption {
  id: string;
  nome: string;
  compartilhada: boolean;
}
