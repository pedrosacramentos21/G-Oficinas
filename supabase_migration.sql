-- Migration for Supabase (PostgreSQL)

-- Table: solicitacoes_andaime
CREATE TABLE IF NOT EXISTS solicitacoes_andaime (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    area TEXT NOT NULL,
    local_setor TEXT NOT NULL,
    tipo_servico TEXT NOT NULL,
    quantidade_pontos INTEGER NOT NULL,
    data_montagem TEXT NOT NULL,
    data_desmontagem TEXT NOT NULL,
    hora_inicio TEXT NOT NULL,
    hora_fim TEXT NOT NULL,
    solicitante TEXT NOT NULL,
    descricao_local TEXT,
    status TEXT DEFAULT 'pendente',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: solicitacoes_pta
CREATE TABLE IF NOT EXISTS solicitacoes_pta (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    equipamento TEXT NOT NULL,
    area TEXT NOT NULL,
    responsavel TEXT NOT NULL,
    data TEXT NOT NULL,
    hora_inicio TEXT NOT NULL,
    hora_fim TEXT NOT NULL,
    descricao TEXT,
    prioridade TEXT NOT NULL,
    status TEXT DEFAULT 'pendente',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: atividades_sala_motores
CREATE TABLE IF NOT EXISTS atividades_sala_motores (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    titulo TEXT NOT NULL,
    responsavel TEXT NOT NULL,
    data TEXT NOT NULL,
    status TEXT DEFAULT 'pendente',
    custo_evitado DOUBLE PRECISION DEFAULT 0,
    causa_raiz TEXT,
    observacoes TEXT,
    data_inicio TIMESTAMPTZ,
    data_conclusao TIMESTAMPTZ,
    data_entrega TIMESTAMPTZ,
    historico_status JSONB DEFAULT '[]',
    area TEXT,
    sub_area TEXT,
    tag_motor TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: oficina_servicos
CREATE TABLE IF NOT EXISTS oficina_servicos (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    servico TEXT NOT NULL,
    responsavel TEXT NOT NULL,
    data TEXT NOT NULL,
    status TEXT DEFAULT 'pendente',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: armstrong_manutencao
CREATE TABLE IF NOT EXISTS armstrong_manutencao (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    titulo TEXT,
    area TEXT NOT NULL,
    equipamento TEXT NOT NULL,
    responsavel TEXT NOT NULL,
    data TEXT NOT NULL,
    hora_inicio TEXT NOT NULL,
    hora_fim TEXT NOT NULL,
    descricao TEXT,
    observacoes TEXT,
    impacto_energetico TEXT,
    investimento_estimado TEXT,
    status TEXT DEFAULT 'Planejada',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: armstrong_pcm_areas
CREATE TABLE IF NOT EXISTS armstrong_pcm_areas (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    data TEXT NOT NULL,
    area TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: armstrong_backlog
CREATE TABLE IF NOT EXISTS armstrong_backlog (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    area TEXT NOT NULL,
    titulo TEXT NOT NULL,
    impacto_energetico TEXT,
    investimento_estimado TEXT,
    data_prevista TEXT,
    status TEXT DEFAULT 'Não planejada',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: refrigeracao_manutencao
CREATE TABLE IF NOT EXISTS refrigeracao_manutencao (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    titulo TEXT,
    area TEXT NOT NULL,
    equipamento TEXT NOT NULL,
    responsavel TEXT NOT NULL,
    data TEXT NOT NULL,
    hora_inicio TEXT NOT NULL,
    hora_fim TEXT NOT NULL,
    descricao TEXT,
    observacoes TEXT,
    impacto_energetico TEXT,
    investimento_estimado TEXT,
    status TEXT DEFAULT 'Planejada',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: refrigeracao_pcm_areas
CREATE TABLE IF NOT EXISTS refrigeracao_pcm_areas (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    data TEXT NOT NULL,
    area TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: refrigeracao_backlog
CREATE TABLE IF NOT EXISTS refrigeracao_backlog (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    area TEXT NOT NULL,
    titulo TEXT NOT NULL,
    impacto_energetico TEXT,
    investimento_estimado TEXT,
    data_prevista TEXT,
    status TEXT DEFAULT 'Não planejada',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS) - Optional but recommended for Supabase
-- For now, we'll keep it simple as the app uses a master password logic in the backend.
-- If the user wants to use Supabase directly from frontend, they'd need RLS policies.
