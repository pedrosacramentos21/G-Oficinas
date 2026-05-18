
export interface ChecklistItem {
  id: string;
  label: string;
}

export interface EquipmentChecklist {
  id: string;
  name: string;
  local: string;
  items: ChecklistItem[];
}

export const WORKSHOP_EQUIPMENT: EquipmentChecklist[] = [
  {
    id: 'esmeril-pequeno',
    name: 'Esmeril Pequeno',
    local: 'Hub Engenharia',
    items: [
      { id: 'rebolo_estado', label: 'Rebolo está em bom estado' },
      { id: 'folga_apoio', label: 'Folga entre o apoio e rebolo está em 3mm' },
      { id: 'emergencia', label: 'Botoeira de emergência funcionando' },
      { id: 'ruido', label: 'Ruído de funcionamento normal' },
      { id: 'chave_estado', label: 'Chave seccionadora em bom estado' },
      { id: 'chave_func', label: 'Chave seccionadora funcionando' },
      { id: 'protecao', label: 'Proteção do rebolo em bom estado de conservação' }
    ]
  },
  {
    id: 'torno-cnc',
    name: 'Torno CNC',
    local: 'Oficina Mecânica',
    items: [
      { id: 'emergencia', label: 'Botoeira de emergência funcionando' },
      { id: 'ruido', label: 'Ruído de funcionamento normal' },
      { id: 'pedais_placa', label: 'Verificar pedais de abre e fecha da placa hidráulica' },
      { id: 'pedais_contraponto', label: 'Verificar pedais de avanço e retorno do contra ponto' },
      { id: 'nivel_oleo_hidraulico', label: 'Conferir nível de óleo da bomba hidráulica' },
      { id: 'bomba_refrigerante', label: 'Conferir se a bomba de óleo refrigerante está funcionando' },
      { id: 'iluminacao', label: 'Iluminação funcionando' },
      { id: 'lubrificacao_eixos', label: 'Verificar lubrificação dos eixos' },
      { id: 'sensores_portas', label: 'Verificar integridade dos sensores das portas' }
    ]
  }
];
