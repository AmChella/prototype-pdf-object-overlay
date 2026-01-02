
function extractElementIdQueues(texSource) {
    if (!texSource || typeof texSource !== 'string') {
        return null;
    }

    const queues = {};
    const push = (role, value) => {
        if (!value) return;
        if (!queues[role]) {
            queues[role] = [];
        }
        queues[role].push(value.trim());
    };

    const titleRegex = /\\title\{[^}]*\}\{([^}]*)\}/g;
    let match;
    while ((match = titleRegex.exec(texSource)) !== null) {
        push('Title', match[1]);
    }

    const paraRegex = /\\paraid\{([^}]*)\}/g;
    while ((match = paraRegex.exec(texSource)) !== null) {
        push('P', match[1]);
    }

    const sectionRegex = /\\section\{[^}]*\}\s*\\label\{([^}]*)\}/g;
    while ((match = sectionRegex.exec(texSource)) !== null) {
        push('H1', match[1]);
    }

    // Hypertarget anchors for figures and tables (start and end)
    const hypertargetRegex = /\\hypertarget\{([^}]*)\}\{\}/g;
    while ((match = hypertargetRegex.exec(texSource)) !== null) {
        const id = match[1];
        if (id.startsWith('fig-')) {
            // only collect the base figure id (skip -end variant)
            if (!id.endsWith('-end')) push('FIG', id);
        } else if (id.startsWith('tbl-')) {
            if (!id.endsWith('-end')) push('TABLE', id);
        }
    }

    return Object.keys(queues).length ? queues : null;
}

module.exports = {
    extractElementIdQueues
};
