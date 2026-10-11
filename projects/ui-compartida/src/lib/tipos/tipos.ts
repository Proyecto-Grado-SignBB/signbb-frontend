/** Nivel de alerta del desenlace de un recorrido, del más leve al más grave. */
export type NivelAlerta = 'NORMAL' | 'CONSULTAR_MEDICO' | 'URGENCIA';

/** Cómo se presenta una pregunta y cómo se interpreta la respuesta del cuidador. */
export type TipoInteraccion = 'SI_NO' | 'SELECCION_UNICA' | 'SELECCION_MULTIPLE';
