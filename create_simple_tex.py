#!/usr/bin/env python3
"""
Create a simplified, working version of the TeX document
"""

def create_simple_version():
    content = r"""
% Generated from ENDEND10921.xml - Scientific Article Template (Simplified)
\documentclass[10pt,a4paper,twocolumn]{article}

% ---------- Encoding, fonts, micro-typography ----------
\usepackage[T1]{fontenc}
\usepackage[utf8]{inputenc}
\usepackage{stix2}                % STIX2 text + math fonts
\usepackage{microtype}

% ---------- Page layout ----------
\usepackage[a4paper,left=20mm,right=20mm,top=25mm,bottom=25mm]{geometry}
\setlength{\columnsep}{12pt}      % space between columns

% ---------- Packages for figures, tables, maths ----------
\usepackage{graphicx}
\usepackage{amsmath,amssymb}
\usepackage{siunitx}
\usepackage{booktabs}
\usepackage{caption}
\usepackage{subcaption}
\usepackage{float}
\usepackage{color}
\usepackage{enumitem}

% ---------- Header / footer ----------
\usepackage{fancyhdr}
\pagestyle{fancy}
\fancyhf{}
\renewcommand{\headrulewidth}{0pt}
\fancyfoot[C]{\thepage}

% ---------- Section title styling ----------
\usepackage{titlesec}
\titleformat{\section}{\normalfont\large\bfseries}{\thesection.}{0.5em}{}
\titleformat{\subsection}{\normalfont\normalsize\bfseries}{\thesubsection.}{0.5em}{}

% ---------- Misc ----------
\usepackage{hyperref}
\hypersetup{colorlinks=true,linkcolor=black,citecolor=black,urlcolor=black}

% ---------- Document ----------
\begin{document}

% Title page spanning both columns
\twocolumn[{%
\begin{center}
\vspace{4mm}
{\large\scshape Blood, The Journal of the American Society of Hematology}

\vspace{6mm}
{\LARGE\bfseries FOXP1 expression is a prognostic biomarker in follicular lymphoma treated with rituximab-containing chemotherapy}

\vspace{6mm}
{\normalsize
Anja Mottok,
Vindi Jurinovic,
Pedro Farinha,
Andreas Rosenwald,
Ellen Leich,
German Ott,
Heike Horn,
Wolfram Klapper,
Michael Boesl,
Wolfgang Hiddemann,
Christian Steidl,
Joseph M. Connors,
Laurie H. Sehn,
Randy D. Gascoyne,
Eva Hoster,
Oliver Weigert,
Robert Kridel}

\vspace{3mm}
{\footnotesize
\textsuperscript{1} Centre for Lymphoid Cancer, BC Cancer Agency, Vancouver, BC, Canada;
\textsuperscript{2} Department of Pathology and Laboratory Medicine, University of British Columbia, Vancouver, BC, Canada;
\textsuperscript{3} Institute of Pathology, University of W\"urzburg and Comprehensive Cancer Centre Mainfranken, W\"urzburg, Germany
}

\vspace{6mm}
\end{center}

% Abstract
\begin{minipage}{0.94\textwidth}
\begin{center}
\textbf{Key Points}
\end{center}
\vspace{-1mm}
\footnotesize

\begin{itemize}
\item High expression of FOXP1 predicts adverse FFS in patients with FL treated with immunochemotherapy.
\item FOXP1 high and low expressors differ in specific gene mutations and gene expression changes.
\end{itemize}

\begin{center}
\textbf{Abstract}
\end{center}
\vspace{-1mm}

Follicular lymphoma (FL) is a clinically and molecularly highly heterogeneous disease, yet prognostication relies predominantly on clinical tools. We recently demonstrated that integration of mutation status of 7 genes, including \textit{EZH2} and \textit{MEF2B,} improves risk stratification. We mined gene expression data to uncover genes that are differentially expressed in \textit{EZH2}- and \textit{MEF2B}-mutated cases. We focused on \textit{FOXP1} and assessed its protein expression by immunohistochemistry (IHC) in 763 tissue biopsies.

High FOXP1 expression was associated with distinct molecular features such as \textit{TP53} mutations, expression of IRF4, and gene expression signatures reminiscent of dark zone germinal center or activated B cells. In summary, FOXP1 is a downstream phenotypic commonality of gene mutations and predicts outcome following rituximab-containing regimens.

\end{minipage}
\vspace{8mm}
}]

\section{Introduction}

Follicular lymphoma (FL) is the second most common subtype of lymphoma, usually characterized by a slowly progressive disease course. However, most patients with FL present with advanced-stage disease and are considered to have an incurable illness with current standard immunochemotherapy regimens, because they will eventually experience progression and/or transformation to aggressive histological status.

The translocation t(14;18)(q32;q21), resulting in the juxtaposition of the \textit{BCL2} gene under the control of the \textit{IGH} promoter, is a genetic hallmark of FL, because it is present in 75\% to 90\% of cases. It has long been recognized that this translocation is insufficient for lymphomagenesis and that additional genetic alterations are required to develop overt FL.

During the last few years, the advent of next-generation sequencing technology has led to dramatic improvements in our understanding of the genetics that underlie pathogenesis and disease evolution. Of particular relevance are genetic aberrations of histone modifiers and chromatin remodeling genes, which are among the most frequently mutated genes in FL and diffuse large B-cell lymphoma (DLBCL).

Although FL is recognized as a clinically and molecularly highly heterogeneous disease, prognostication relies predominantly on clinical tools, and there is currently no consensus strategy that allows for risk-based treatment stratification. We have recently demonstrated that integration of the mutation status of 7 genes (including \textit{EZH2} and \textit{MEF2B}) into a combined clinic-genetic risk model improves risk stratification and represents a promising approach to identify a subset of patients at highest risk of treatment failure.

\section{Methods}

In total, we analyzed tissue biopsies from 763 patients with FL in this study. The training cohort consisted of 142 patients who had been treated with rituximab, cyclophosphamide, vincristine, and prednisone (\textit{R}-CVP) at the BC Cancer Agency (BCCA) between 2003 and 2009.

The validation cohort consisted of 395 patients with advanced-stage FL who were prospectively included into trials from the German Low-Grade Lymphoma Study Group (GLSG). Patients were considered eligible for this study if they had been treated with cyclophosphamide, doxorubicin, vincristine, and prednisone (CHOP) as part of the GLSG1996 trial, or CHOP with rituximab (\textit{R}-CHOP) or without rituximab as part of the GLSG2000 trial.

IHC for FOXP1 was performed on tissue microarrays using a monoclonal mouse antibody against FOXP1 (clone JC12, ThermoFisher Scientific). IHC staining was performed on a Ventana BenchMark XT system (Ventana Medical Systems), and slides were independently evaluated by 2 hematopathologists.

\section{Results}

We found FOXP1 to be significantly downregulated in both \textit{EZH2}- and \textit{MEF2B}-mutated cases. By IHC, 76 specimens in the training cohort (54\%) had high FOXP1 expression (>10\%), which was associated with reduced 5-year failure-free survival (FFS) rates (55\% vs 70\%).

In the validation cohort, high FOXP1 expression status was observed in 248 patients (63\%) and correlated with significantly shorter FFS in patients treated with \textit{R}-CHOP (hazard ratio [HR], 1.95; \textit{P} = .017) but not in patients treated with CHOP (HR, 1.15; \textit{P} = .44).

The impact of high FOXP1 expression on FFS in immunochemotherapy-treated patients was additional to the Follicular Lymphoma International Prognostic Index. High FOXP1 expression was associated with distinct molecular features such as \textit{TP53} mutations, expression of IRF4, and gene expression signatures reminiscent of dark zone germinal center or activated B cells.

\section{Discussion}

In this study, we identified FOXP1 as a biomarker for outcome prediction in FL treated with rituximab-containing regimens. Our findings demonstrate that FOXP1 expression represents a downstream phenotypic commonality of mutations in chromatin-modifying genes and provides additional prognostic information beyond established clinical parameters.

The association between high FOXP1 expression and poor outcomes specifically in the context of rituximab-containing therapy suggests that FOXP1 may represent a marker of rituximab resistance or may identify tumors with distinct biological characteristics that are less responsive to immunochemotherapy.

\section{Conclusions}

In summary, FOXP1 is a downstream phenotypic commonality of gene mutations and predicts outcome following rituximab-containing regimens. These findings open new avenues for pursuing distinct therapeutic targeting of vulnerabilities associated with FOXP1 expression status and may inform future risk-adapted treatment strategies for patients with FL.

\section{Acknowledgments}

We thank all patients who participated in this study and the clinical research teams who facilitated patient recruitment and sample collection.

\end{document}
""".strip()
    
    return content

def main():
    output_file = '/Users/che/Code/Tutorial/pdf-element-overlay/TeX/ENDEND10921-simple.tex'
    
    print("Creating simplified TeX version...")
    content = create_simple_version()
    
    print(f"Writing {output_file}...")
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("✅ Simplified TeX document created successfully!")

if __name__ == '__main__':
    main()