#!/usr/bin/env python3
"""Processa microdados SARESP 2025 para as 26 escolas estaduais alvo."""

import pandas as pd
import json
import os
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# 26 escolas alvo com CODESC, nome oficial e município
TARGET_SCHOOLS = {
    '22573':  {'nome': 'EE Dona Adélia Frascino', 'municipio': 'PONTAL', 'nomesc': 'ADELIA FRASCINO DONA'},
    '22664':  {'nome': 'PEI EE Domingos Paro', 'municipio': 'PITANGUEIRAS', 'nomesc': 'DOMINGOS PARO'},
    '22494':  {'nome': 'PEI EE Maria Falconi de Felício', 'municipio': 'PITANGUEIRAS', 'nomesc': 'MARIA FALCONI DE FELICIO'},
    '22755':  {'nome': 'EE Maurício Montecchi', 'municipio': 'PITANGUEIRAS', 'nomesc': 'MAURICIO MONTECCHI'},
    '22640':  {'nome': 'EE Orminda Guimarães Cotrim', 'municipio': 'PITANGUEIRAS', 'nomesc': 'ORMINDA GUIMARAES COTRIM'},
    '914356': {'nome': 'EE Prof. Basílio Rodrigues da Silva', 'municipio': 'PONTAL', 'nomesc': 'BASILIO RODRIGUES DA SILVA PROFESSOR'},
    '22676':  {'nome': 'PEI EE Profª Dolores Belém Novaes', 'municipio': 'PONTAL', 'nomesc': 'DOLORES BELEM NOVAES PROFESSORA'},
    '22559':  {'nome': 'EE Profª Dolores Martins de Castro', 'municipio': 'PONTAL', 'nomesc': 'DOLORES MARTINS DE CASTRO PROFESSORA'},
    '49585':  {'nome': 'EE Anna Passamonti Balardin', 'municipio': 'SERTÃOZINHO', 'nomesc': 'ANNA PASSAMONTI BALARDIN'},
    '23620':  {'nome': 'PEI EE Dr. Antônio Furlan Júnior', 'municipio': 'SERTÃOZINHO', 'nomesc': 'ANTONIO FURLAN JUNIOR DOUTOR'},
    '23486':  {'nome': 'EE Dr. Isaías José Ferreira', 'municipio': 'SERTÃOZINHO', 'nomesc': 'ISAIAS JOSE FERREIRA DOUTOR'},
    '905847': {'nome': 'EE Ferrucio Chiaratti', 'municipio': 'SERTÃOZINHO', 'nomesc': 'FERRUCIO CHIARATTI'},
    '922717': {'nome': 'EE Profª Edith Silveira Dalmaso', 'municipio': 'SERTÃOZINHO', 'nomesc': 'EDITH SILVEIRA DALMASO PROFESSORA'},
    '44635':  {'nome': 'PEI EE Profª Maria Conceição R. Silva Magon', 'municipio': 'SERTÃOZINHO', 'nomesc': 'MARIA CONCEICAO RODRIGUES SILVA MAGON PROFESSORA'},
    '923023': {'nome': 'EE Profª Nícia Fabíola Zanutto Giraldi', 'municipio': 'SERTÃOZINHO', 'nomesc': 'NICIA FABIOLA ZANUTO GIRALDI PROFESSORA'},
    '22585':  {'nome': 'EE Odulfo de Oliveira Guimarães', 'municipio': 'VIRADOURO', 'nomesc': 'ODULFO DE OLIVEIRA GUIMARAES'},
    '22561':  {'nome': 'EE Profª Josepha Castro', 'municipio': 'PONTAL', 'nomesc': 'JOSEPHA CASTRO PROFESSORA'},
    '23553':  {'nome': 'EE Prof. Bruno Pieroni', 'municipio': 'SERTÃOZINHO', 'nomesc': 'BRUNO PIERONI PROFESSOR'},
    '23607':  {'nome': 'PEI EE Winston Churchill', 'municipio': 'SERTÃOZINHO', 'nomesc': 'WINSTON CHURCHILL'},
    '23985':  {'nome': 'EE Dr. Mário Lins', 'municipio': 'JARDINÓPOLIS', 'nomesc': 'MARIO LINS DOUTOR'},
    '915002': {'nome': 'EE Luiz Marcari', 'municipio': 'BARRINHA', 'nomesc': 'LUIZ MARCARI'},
    '22639':  {'nome': 'PEI EE Profª Maria Élyde Mônaco dos Santos', 'municipio': 'TERRA ROXA', 'nomesc': 'MARIA ELYDE MONACO DOS SANTOS PROFESSORA'},
    '23528':  {'nome': 'PEI EE Prof. Nestor Gomes de Araújo', 'municipio': 'DUMONT', 'nomesc': 'NESTOR GOMES DE ARAUJO PROFESSOR'},
    '24144':  {'nome': 'EE Prof. Plínio Berardo', 'municipio': 'JARDINÓPOLIS', 'nomesc': 'PLINIO BERARDO PROFESSOR'},
    '127875': {'nome': 'EE Profª Yolanda Luiz Sichieri', 'municipio': 'PONTAL', 'nomesc': 'YOLANDA LUIZ SICHIERI PROFESSORA'},
    '23619':  {'nome': 'PEI EE Prof. José Luiz de Siqueira', 'municipio': 'BARRINHA', 'nomesc': 'JOSE LUIZ DE SIQUEIRA PROFESSOR'},
}

TARGET_CODESC = list(TARGET_SCHOOLS.keys())

PROFICIENCY_LEVELS = ['Avancado', 'Adequado', 'Basico', 'Abaixo do Basico']


def read_and_filter(filepath, codesc_list):
    """Lê CSV e filtra para as escolas alvo."""
    print(f'  Lendo {os.path.basename(filepath)}...')
    df = pd.read_csv(filepath, encoding='utf-8', dtype={'CODESC': str}, low_memory=False)
    filtered = df[df['CODESC'].isin(codesc_list)].copy()
    print(f'  -> {len(filtered)} linhas filtradas de {len(df)} total')
    return filtered


def compute_ef_stats(df):
    """Estatísticas do Ensino Fundamental (com proficiência)."""
    if df.empty:
        return None

    # Converter proficiências (formato brasileiro "283,80" -> 283.80)
    for col in ['profic_lp', 'profic_mat']:
        df[col] = df[col].astype(str).replace('null', pd.NA).replace('nan', pd.NA)
        df[col] = df[col].str.replace(',', '.', regex=False)
        df[col] = pd.to_numeric(df[col], errors='coerce')

    for col in ['particip_lp', 'particip_mat']:
        df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0).astype(int)

    result = {'grades': {}, 'totals': {}}

    for grade, gdf in df.groupby('SERIE_ANO'):
        grade_key = grade.strip()
        part_lp = gdf[gdf['particip_lp'] == 1]
        part_mat = gdf[gdf['particip_mat'] == 1]
        valid_lp = part_lp['profic_lp'].dropna()
        valid_mat = part_mat['profic_mat'].dropna()

        level_dist_lp = {}
        level_dist_mat = {}
        for level in PROFICIENCY_LEVELS:
            level_dist_lp[level] = int((part_lp['nivel_profic_lp'] == level).sum())
            level_dist_mat[level] = int((part_mat['nivel_profic_mat'] == level).sum())

        n = len(gdf)
        result['grades'][grade_key] = {
            'grade_label': grade_key,
            'total_students': n,
            'participants_lp': len(part_lp),
            'participants_mat': len(part_mat),
            'participation_rate_lp': round(len(part_lp) / n, 4) if n > 0 else 0,
            'participation_rate_mat': round(len(part_mat) / n, 4) if n > 0 else 0,
            'avg_profic_lp': round(float(valid_lp.mean()), 2) if len(valid_lp) > 0 else None,
            'avg_profic_mat': round(float(valid_mat.mean()), 2) if len(valid_mat) > 0 else None,
            'median_profic_lp': round(float(valid_lp.median()), 2) if len(valid_lp) > 0 else None,
            'median_profic_mat': round(float(valid_mat.median()), 2) if len(valid_mat) > 0 else None,
            'std_profic_lp': round(float(valid_lp.std()), 2) if len(valid_lp) > 1 else None,
            'std_profic_mat': round(float(valid_mat.std()), 2) if len(valid_mat) > 1 else None,
            'proficiency_levels_lp': level_dist_lp,
            'proficiency_levels_mat': level_dist_mat,
        }

    # Totais
    all_part_lp = df[df['particip_lp'] == 1]
    all_part_mat = df[df['particip_mat'] == 1]
    all_valid_lp = all_part_lp['profic_lp'].dropna()
    all_valid_mat = all_part_mat['profic_mat'].dropna()

    total_levels_lp = {}
    total_levels_mat = {}
    for level in PROFICIENCY_LEVELS:
        total_levels_lp[level] = int((all_part_lp['nivel_profic_lp'] == level).sum())
        total_levels_mat[level] = int((all_part_mat['nivel_profic_mat'] == level).sum())

    n = len(df)
    result['totals'] = {
        'total_students': n,
        'participants_lp': len(all_part_lp),
        'participants_mat': len(all_part_mat),
        'participation_rate_lp': round(len(all_part_lp) / n, 4) if n > 0 else 0,
        'participation_rate_mat': round(len(all_part_mat) / n, 4) if n > 0 else 0,
        'avg_profic_lp': round(float(all_valid_lp.mean()), 2) if len(all_valid_lp) > 0 else None,
        'avg_profic_mat': round(float(all_valid_mat.mean()), 2) if len(all_valid_mat) > 0 else None,
        'median_profic_lp': round(float(all_valid_lp.median()), 2) if len(all_valid_lp) > 0 else None,
        'median_profic_mat': round(float(all_valid_mat.median()), 2) if len(all_valid_mat) > 0 else None,
        'pct_adequado_avancado_lp': round(
            (total_levels_lp.get('Adequado', 0) + total_levels_lp.get('Avancado', 0)) /
            len(all_part_lp) * 100, 1
        ) if len(all_part_lp) > 0 else None,
        'pct_adequado_avancado_mat': round(
            (total_levels_mat.get('Adequado', 0) + total_levels_mat.get('Avancado', 0)) /
            len(all_part_mat) * 100, 1
        ) if len(all_part_mat) > 0 else None,
        'proficiency_levels_lp': total_levels_lp,
        'proficiency_levels_mat': total_levels_mat,
    }

    return result


def compute_af_stats(df):
    """Estatísticas dos Anos Finais (participação)."""
    if df.empty:
        return None

    for col in ['particip_dia1', 'particip_dia2']:
        df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0).astype(int)

    result = {'grades': {}, 'totals': {}}

    for grade, gdf in df.groupby('SERIE_ANO'):
        grade_key = grade.strip()
        n = len(gdf)
        p1 = int((gdf['particip_dia1'] == 1).sum())
        p2 = int((gdf['particip_dia2'] == 1).sum())
        both = int(((gdf['particip_dia1'] == 1) & (gdf['particip_dia2'] == 1)).sum())

        result['grades'][grade_key] = {
            'grade_label': grade_key,
            'total_students': n,
            'participants_dia1': p1,
            'participants_dia2': p2,
            'participants_both': both,
            'participation_rate_dia1': round(p1 / n, 4) if n > 0 else 0,
            'participation_rate_dia2': round(p2 / n, 4) if n > 0 else 0,
            'participation_rate_both': round(both / n, 4) if n > 0 else 0,
        }

    n = len(df)
    p1 = int((df['particip_dia1'] == 1).sum())
    p2 = int((df['particip_dia2'] == 1).sum())
    both = int(((df['particip_dia1'] == 1) & (df['particip_dia2'] == 1)).sum())

    result['totals'] = {
        'total_students': n,
        'participants_dia1': p1,
        'participants_dia2': p2,
        'participants_both': both,
        'participation_rate_dia1': round(p1 / n, 4) if n > 0 else 0,
        'participation_rate_dia2': round(p2 / n, 4) if n > 0 else 0,
        'participation_rate_both': round(both / n, 4) if n > 0 else 0,
    }

    return result


def compute_em_stats(df):
    """Estatísticas do Ensino Médio (participação)."""
    if df.empty:
        return None

    for col in ['particip_lg_cn', 'particip_mat_ch']:
        df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0).astype(int)

    result = {'grades': {}, 'totals': {}}

    for grade, gdf in df.groupby('SERIE_ANO'):
        grade_key = grade.strip()
        n = len(gdf)
        p_lg = int((gdf['particip_lg_cn'] == 1).sum())
        p_mat = int((gdf['particip_mat_ch'] == 1).sum())
        both = int(((gdf['particip_lg_cn'] == 1) & (gdf['particip_mat_ch'] == 1)).sum())

        result['grades'][grade_key] = {
            'grade_label': grade_key,
            'total_students': n,
            'participants_lg_cn': p_lg,
            'participants_mat_ch': p_mat,
            'participants_both': both,
            'participation_rate_lg_cn': round(p_lg / n, 4) if n > 0 else 0,
            'participation_rate_mat_ch': round(p_mat / n, 4) if n > 0 else 0,
            'participation_rate_both': round(both / n, 4) if n > 0 else 0,
        }

    n = len(df)
    p_lg = int((df['particip_lg_cn'] == 1).sum())
    p_mat = int((df['particip_mat_ch'] == 1).sum())
    both = int(((df['particip_lg_cn'] == 1) & (df['particip_mat_ch'] == 1)).sum())

    result['totals'] = {
        'total_students': n,
        'participants_lg_cn': p_lg,
        'participants_mat_ch': p_mat,
        'participants_both': both,
        'participation_rate_lg_cn': round(p_lg / n, 4) if n > 0 else 0,
        'participation_rate_mat_ch': round(p_mat / n, 4) if n > 0 else 0,
        'participation_rate_both': round(both / n, 4) if n > 0 else 0,
    }

    return result


def build_rankings(schools_data):
    """Constroi rankings."""
    rankings = {}

    # Ranking proficiência LP
    schools_with_lp = []
    for codesc, data in schools_data.items():
        ef = data.get('ensino_fundamental')
        if ef and ef['totals'].get('avg_profic_lp') is not None:
            schools_with_lp.append({
                'codesc': codesc,
                'nome': data['nome'],
                'municipio': data['municipio'],
                'valor': ef['totals']['avg_profic_lp'],
                'participantes': ef['totals']['participants_lp'],
            })
    rankings['proficiencia_lp'] = sorted(schools_with_lp, key=lambda x: x['valor'], reverse=True)

    # Ranking proficiência MAT
    schools_with_mat = []
    for codesc, data in schools_data.items():
        ef = data.get('ensino_fundamental')
        if ef and ef['totals'].get('avg_profic_mat') is not None:
            schools_with_mat.append({
                'codesc': codesc,
                'nome': data['nome'],
                'municipio': data['municipio'],
                'valor': ef['totals']['avg_profic_mat'],
                'participantes': ef['totals']['participants_mat'],
            })
    rankings['proficiencia_mat'] = sorted(schools_with_mat, key=lambda x: x['valor'], reverse=True)

    # Ranking % Adequado+Avançado LP
    schools_aa_lp = []
    for codesc, data in schools_data.items():
        ef = data.get('ensino_fundamental')
        if ef and ef['totals'].get('pct_adequado_avancado_lp') is not None:
            schools_aa_lp.append({
                'codesc': codesc,
                'nome': data['nome'],
                'municipio': data['municipio'],
                'valor': ef['totals']['pct_adequado_avancado_lp'],
                'participantes': ef['totals']['participants_lp'],
            })
    rankings['pct_adequado_avancado_lp'] = sorted(schools_aa_lp, key=lambda x: x['valor'], reverse=True)

    # Ranking % Adequado+Avançado MAT
    schools_aa_mat = []
    for codesc, data in schools_data.items():
        ef = data.get('ensino_fundamental')
        if ef and ef['totals'].get('pct_adequado_avancado_mat') is not None:
            schools_aa_mat.append({
                'codesc': codesc,
                'nome': data['nome'],
                'municipio': data['municipio'],
                'valor': ef['totals']['pct_adequado_avancado_mat'],
                'participantes': ef['totals']['participants_mat'],
            })
    rankings['pct_adequado_avancado_mat'] = sorted(schools_aa_mat, key=lambda x: x['valor'], reverse=True)

    # Ranking participação geral (todas 26 escolas)
    all_participation = []
    for codesc, data in schools_data.items():
        total_students = 0
        total_participants = 0
        segments = []

        ef = data.get('ensino_fundamental')
        if ef:
            n = ef['totals']['total_students']
            p = max(ef['totals']['participants_lp'], ef['totals']['participants_mat'])
            total_students += n
            total_participants += p
            segments.append('EF')

        af = data.get('anos_finais')
        if af:
            n = af['totals']['total_students']
            p = af['totals']['participants_both']
            total_students += n
            total_participants += p
            segments.append('AF')

        em = data.get('ensino_medio')
        if em:
            n = em['totals']['total_students']
            p = em['totals']['participants_both']
            total_students += n
            total_participants += p
            segments.append('EM')

        rate = round(total_participants / total_students, 4) if total_students > 0 else 0
        all_participation.append({
            'codesc': codesc,
            'nome': data['nome'],
            'municipio': data['municipio'],
            'valor': round(rate * 100, 1),
            'total_alunos': total_students,
            'total_participantes': total_participants,
            'segmentos': segments,
        })
    rankings['participacao_geral'] = sorted(all_participation, key=lambda x: x['valor'], reverse=True)

    return rankings


def build_municipality_stats(schools_data):
    """Agrega estatísticas por município."""
    mun_map = {}
    for codesc, data in schools_data.items():
        mun = data['municipio']
        if mun not in mun_map:
            mun_map[mun] = {'escolas': [], 'total_alunos_ef': 0, 'total_alunos_af': 0,
                            'total_alunos_em': 0, 'sum_profic_lp': 0, 'count_profic_lp': 0,
                            'sum_profic_mat': 0, 'count_profic_mat': 0}
        m = mun_map[mun]
        m['escolas'].append({'codesc': codesc, 'nome': data['nome']})

        ef = data.get('ensino_fundamental')
        if ef:
            m['total_alunos_ef'] += ef['totals']['total_students']
            if ef['totals']['avg_profic_lp'] is not None:
                m['sum_profic_lp'] += ef['totals']['avg_profic_lp'] * ef['totals']['participants_lp']
                m['count_profic_lp'] += ef['totals']['participants_lp']
            if ef['totals']['avg_profic_mat'] is not None:
                m['sum_profic_mat'] += ef['totals']['avg_profic_mat'] * ef['totals']['participants_mat']
                m['count_profic_mat'] += ef['totals']['participants_mat']

        af = data.get('anos_finais')
        if af:
            m['total_alunos_af'] += af['totals']['total_students']

        em = data.get('ensino_medio')
        if em:
            m['total_alunos_em'] += em['totals']['total_students']

    result = {}
    for mun, m in mun_map.items():
        result[mun] = {
            'municipio': mun,
            'num_escolas': len(m['escolas']),
            'escolas': m['escolas'],
            'total_alunos_ef': m['total_alunos_ef'],
            'total_alunos_af': m['total_alunos_af'],
            'total_alunos_em': m['total_alunos_em'],
            'total_alunos': m['total_alunos_ef'] + m['total_alunos_af'] + m['total_alunos_em'],
            'avg_profic_lp': round(m['sum_profic_lp'] / m['count_profic_lp'], 2) if m['count_profic_lp'] > 0 else None,
            'avg_profic_mat': round(m['sum_profic_mat'] / m['count_profic_mat'], 2) if m['count_profic_mat'] > 0 else None,
        }
    return result


def build_summary_text(schools_data, rankings, municipalities):
    """Gera texto-resumo para o prompt do LLM."""
    lines = []
    lines.append('SARESP 2025 - Análise de 26 Escolas Estaduais')
    lines.append('Diretoria de Ensino - Região de Sertãozinho')
    lines.append(f'Municípios: {", ".join(sorted(municipalities.keys()))}')
    lines.append('')

    for codesc, data in schools_data.items():
        lines.append(f'=== {data["nome"]} ({data["municipio"]}) - CODESC {codesc} ===')

        ef = data.get('ensino_fundamental')
        if ef:
            t = ef['totals']
            lines.append(f'  ENSINO FUNDAMENTAL: {t["total_students"]} alunos matriculados')
            if t['avg_profic_lp'] is not None:
                lines.append(f'    Língua Portuguesa: média={t["avg_profic_lp"]}, mediana={t["median_profic_lp"]}')
                lvls = t['proficiency_levels_lp']
                lines.append(f'      Níveis: Avançado={lvls.get("Avancado",0)}, Adequado={lvls.get("Adequado",0)}, Básico={lvls.get("Basico",0)}, Abaixo do Básico={lvls.get("Abaixo do Basico",0)}')
                lines.append(f'      % Adequado+Avançado: {t["pct_adequado_avancado_lp"]}%')
            if t['avg_profic_mat'] is not None:
                lines.append(f'    Matemática: média={t["avg_profic_mat"]}, mediana={t["median_profic_mat"]}')
                lvls = t['proficiency_levels_mat']
                lines.append(f'      Níveis: Avançado={lvls.get("Avancado",0)}, Adequado={lvls.get("Adequado",0)}, Básico={lvls.get("Basico",0)}, Abaixo do Básico={lvls.get("Abaixo do Basico",0)}')
                lines.append(f'      % Adequado+Avançado: {t["pct_adequado_avancado_mat"]}%')
            lines.append(f'    Participação LP: {t["participation_rate_lp"]*100:.1f}%, MAT: {t["participation_rate_mat"]*100:.1f}%')
            for gk, gv in ef['grades'].items():
                lines.append(f'    {gk}: {gv["total_students"]} alunos, LP média={gv["avg_profic_lp"]}, MAT média={gv["avg_profic_mat"]}')

        af = data.get('anos_finais')
        if af:
            t = af['totals']
            lines.append(f'  ANOS FINAIS: {t["total_students"]} alunos, participação ambos os dias: {t["participation_rate_both"]*100:.1f}%')
            for gk, gv in af['grades'].items():
                lines.append(f'    {gk}: {gv["total_students"]} alunos, participação: {gv["participation_rate_both"]*100:.1f}%')

        em = data.get('ensino_medio')
        if em:
            t = em['totals']
            lines.append(f'  ENSINO MÉDIO: {t["total_students"]} alunos, participação ambas as provas: {t["participation_rate_both"]*100:.1f}%')
            for gk, gv in em['grades'].items():
                lines.append(f'    {gk}: {gv["total_students"]} alunos, participação: {gv["participation_rate_both"]*100:.1f}%')

        lines.append('')

    lines.append('=== RANKINGS ===')
    lines.append('')
    lines.append('PROFICIÊNCIA LÍNGUA PORTUGUESA (média):')
    for i, s in enumerate(rankings['proficiencia_lp'], 1):
        lines.append(f'  {i}º {s["nome"]} ({s["municipio"]}): {s["valor"]}')

    lines.append('')
    lines.append('PROFICIÊNCIA MATEMÁTICA (média):')
    for i, s in enumerate(rankings['proficiencia_mat'], 1):
        lines.append(f'  {i}º {s["nome"]} ({s["municipio"]}): {s["valor"]}')

    lines.append('')
    lines.append('% ADEQUADO+AVANÇADO LP:')
    for i, s in enumerate(rankings['pct_adequado_avancado_lp'], 1):
        lines.append(f'  {i}º {s["nome"]} ({s["municipio"]}): {s["valor"]}%')

    lines.append('')
    lines.append('% ADEQUADO+AVANÇADO MAT:')
    for i, s in enumerate(rankings['pct_adequado_avancado_mat'], 1):
        lines.append(f'  {i}º {s["nome"]} ({s["municipio"]}): {s["valor"]}%')

    lines.append('')
    lines.append('PARTICIPAÇÃO GERAL:')
    for i, s in enumerate(rankings['participacao_geral'], 1):
        lines.append(f'  {i}º {s["nome"]} ({s["municipio"]}): {s["valor"]}% ({s["total_participantes"]}/{s["total_alunos"]} alunos, segmentos: {",".join(s["segmentos"])})')

    lines.append('')
    lines.append('=== MUNICÍPIOS ===')
    for mun, m in municipalities.items():
        lines.append(f'{mun}: {m["num_escolas"]} escolas, {m["total_alunos"]} alunos total')
        if m['avg_profic_lp']:
            lines.append(f'  Proficiência média LP: {m["avg_profic_lp"]}, MAT: {m["avg_profic_mat"]}')

    return '\n'.join(lines)


def main():
    print('Processando dados SARESP 2025...')
    print()

    # Lê e filtra cada arquivo
    ef_path = os.path.join(BASE_DIR, 'Microdados de Alunos - Ensino Fundamental SARESP - 2025.csv')
    af_path = os.path.join(BASE_DIR, 'Microdados de Alunos - Anos Finais SARESP - 2025.csv')
    em_path = os.path.join(BASE_DIR, 'Microdados de Alunos - Ensino Medio Provao - 2025.csv')

    print('[1/3] Ensino Fundamental')
    df_ef = read_and_filter(ef_path, TARGET_CODESC)

    print('[2/3] Anos Finais')
    df_af = read_and_filter(af_path, TARGET_CODESC)

    print('[3/3] Ensino Médio')
    df_em = read_and_filter(em_path, TARGET_CODESC)

    print()
    print('Computando estatísticas por escola...')

    schools_data = {}
    for codesc, info in TARGET_SCHOOLS.items():
        school_ef = df_ef[df_ef['CODESC'] == codesc].copy()
        school_af = df_af[df_af['CODESC'] == codesc].copy()
        school_em = df_em[df_em['CODESC'] == codesc].copy()

        ef_stats = compute_ef_stats(school_ef) if not school_ef.empty else None
        af_stats = compute_af_stats(school_af) if not school_af.empty else None
        em_stats = compute_em_stats(school_em) if not school_em.empty else None

        segments = []
        if ef_stats:
            segments.append('EF')
        if af_stats:
            segments.append('AF')
        if em_stats:
            segments.append('EM')

        schools_data[codesc] = {
            'nome': info['nome'],
            'codesc': codesc,
            'municipio': info['municipio'],
            'nomesc': info['nomesc'],
            'segmentos': segments,
            'ensino_fundamental': ef_stats,
            'anos_finais': af_stats,
            'ensino_medio': em_stats,
        }

        seg_str = ', '.join(segments) if segments else 'NENHUM'
        print(f'  {info["nome"]} ({info["municipio"]}): {seg_str}')

    print()
    print('Computando rankings...')
    rankings = build_rankings(schools_data)

    print('Computando agregados por município...')
    municipalities = build_municipality_stats(schools_data)

    print('Gerando texto-resumo para LLM...')
    summary_text = build_summary_text(schools_data, rankings, municipalities)

    output = {
        'metadata': {
            'title': 'SARESP 2025 - 26 Escolas Estaduais - DE Sertãozinho',
            'total_schools': len(TARGET_SCHOOLS),
            'municipalities': sorted(list(set(s['municipio'] for s in TARGET_SCHOOLS.values()))),
            'segments': {
                'ensino_fundamental': 'Proficiência LP e MAT + Participação',
                'anos_finais': 'Participação (dia 1 e dia 2)',
                'ensino_medio': 'Participação (Linguagens/CN e MAT/CH)',
            },
        },
        'schools': schools_data,
        'rankings': rankings,
        'municipalities': municipalities,
        'summary_text': summary_text,
    }

    output_dir = os.path.join(BASE_DIR, 'public', 'data')
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, 'saresp_data.json')

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    size_kb = os.path.getsize(output_path) / 1024
    print()
    print(f'Arquivo gerado: {output_path}')
    print(f'Tamanho: {size_kb:.1f} KB')
    print(f'Escolas processadas: {len(schools_data)}')
    print(f'Rankings: {list(rankings.keys())}')
    print(f'Municípios: {list(municipalities.keys())}')
    print('Concluído!')


if __name__ == '__main__':
    main()
