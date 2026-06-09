import {el} from '../../util/utils';

function openNotesView(
    area: HTMLElement,
    previousWrap: HTMLElement,
    source: any,
    noteStyles: Record<string, { icon: string; color: string; label: string }>
) {
    previousWrap.style.display = 'none';

    const notesView = el('div', { padding: '14px' });

    // Back button
    const back = el('div', {
        display: 'flex', alignItems: 'center', gap: '8px',
        cursor: 'pointer', marginBottom: '14px', padding: '6px 0',
    });
    const bArr = el('span', {
        fontSize: '14px', color: '#7c5cf7', fontWeight: '600',
        display: 'inline-block', transition: 'transform 0.15s ease',
    }, '◂');
    const bLbl = el('span', { fontSize: '12px', fontWeight: '600', color: '#888' }, 'Back to summary');
    back.appendChild(bArr);
    back.appendChild(bLbl);
    back.addEventListener('mouseenter', () => { bArr.style.transform = 'translateX(-3px)'; bLbl.style.color = '#fff'; });
    back.addEventListener('mouseleave', () => { bArr.style.transform = 'translateX(0)'; bLbl.style.color = '#888'; });
    back.addEventListener('click', () => {
        area.removeChild(notesView);
        previousWrap.style.display = 'block';
    });
    notesView.appendChild(back);

    // ── Source Header ──
    const headerCard = el('div', {
        padding: '16px', background: '#111125', borderRadius: '10px',
        border: '1px solid #1a1a34', marginBottom: '14px',
    });
    const sourceRow = el('div', {
        display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px',
    });
    sourceRow.appendChild(el('span', { fontSize: '14px' }, '🔗'));
    sourceRow.appendChild(el('div', {
        fontSize: '14px', fontWeight: '700', color: '#a78bfa',
    }, source.hostname));
    headerCard.appendChild(sourceRow);
    headerCard.appendChild(el('div', {
        fontSize: '10px', color: '#555', marginBottom: '10px',
    }, source.path));

    const statRow = el('div', { display: 'flex', gap: '10px', flexWrap: 'wrap' });
    [
        { icon: '📝', text: `${source.noteCount} notes` },
        { icon: '🕐', text: source.time },
        { icon: '⏱', text: '12 min reading' },
        { icon: '✦', text: '2 explanations used' },
    ].forEach(s => {
        const stat = el('div', {
            display: 'flex', alignItems: 'center', gap: '4px',
            padding: '3px 8px', background: '#0e0e1e', borderRadius: '6px',
        });
        stat.appendChild(el('span', { fontSize: '8px' }, s.icon));
        stat.appendChild(el('span', { fontSize: '8px', color: '#666', fontWeight: '600' }, s.text));
        statRow.appendChild(stat);
    });
    headerCard.appendChild(statRow);
    notesView.appendChild(headerCard);

    // ── Page Summary ──
    const summaryCard = el('div', {
        padding: '14px', background: '#111125', borderRadius: '10px',
        border: '1px solid #1a1a34', marginBottom: '14px',
    });
    summaryCard.appendChild(el('div', {
        fontSize: '9px', fontWeight: '700', textTransform: 'uppercase',
        letterSpacing: '1.2px', color: '#666', marginBottom: '8px',
    }, 'Page Summary'));
    summaryCard.appendChild(el('div', {
        fontSize: '11px', color: '#999', lineHeight: '1.7',
        padding: '10px 12px', background: '#0e0e1e', borderRadius: '8px',
        borderLeft: '2px solid #7c5cf7',
    }, 'This page covers the fundamentals of permanent magnets, explaining how electron spin creates magnetic properties. It details how atomic alignment in ferromagnetic materials creates magnetic domains, and how external fields can force permanent alignment.'));
    notesView.appendChild(summaryCard);

    // ── Key Equations ──
    const eqCard = el('div', {
        padding: '14px', background: '#111125', borderRadius: '10px',
        border: '1px solid #1a1a34', marginBottom: '14px',
    });
    eqCard.appendChild(el('div', {
        fontSize: '9px', fontWeight: '700', textTransform: 'uppercase',
        letterSpacing: '1.2px', color: '#666', marginBottom: '10px',
    }, 'Key Equations'));

    const equations = [
        { name: 'Magnetic Force', eq: 'F = qv × B', desc: 'Force on a moving charge in a magnetic field. q is charge, v is velocity, B is field strength.' },
        { name: 'Magnetic Field (Solenoid)', eq: 'B = μ₀nI', desc: 'Field inside a solenoid. μ₀ is permeability, n is turns per length, I is current.' },
        { name: 'Magnetic Flux', eq: 'Φ = B · A · cos(θ)', desc: 'Total magnetic field passing through a surface area A at angle θ.' },
    ];

    equations.forEach(eq => {
        const eqRow = el('div', {
            padding: '12px', background: '#0e0e1e', borderRadius: '8px',
            marginBottom: '6px', border: '1px solid transparent',
            transition: 'all 0.15s',
        });

        const eqTop = el('div', {
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: '8px',
        });
        eqTop.appendChild(el('span', {
            fontSize: '9px', fontWeight: '700', color: '#ec4899',
            textTransform: 'uppercase', letterSpacing: '0.8px',
        }, eq.name));
        eqTop.appendChild(el('span', {
            fontSize: '7px', color: '#ec4899', background: '#ec489915',
            padding: '2px 5px', borderRadius: '4px', fontWeight: '700',
        }, '∑ EQUATION'));
        eqRow.appendChild(eqTop);

        // Equation display
        const eqDisplay = el('div', {
            textAlign: 'center', padding: '12px 8px',
            background: '#080816', borderRadius: '6px',
            marginBottom: '8px', border: '1px solid #1a1a34',
        });
        eqDisplay.appendChild(el('div', {
            fontSize: '16px', fontWeight: '700', color: '#fff',
            fontFamily: '"Cambria Math", "Latin Modern Math", Georgia, serif',
            letterSpacing: '1px',
        }, eq.eq));
        eqRow.appendChild(eqDisplay);

        // Description (collapsible)
        const descToggle = el('div', {
            display: 'flex', alignItems: 'center', gap: '4px',
            cursor: 'pointer', fontSize: '9px', color: '#555',
            fontWeight: '600',
        });
        const arrow = el('span', { transition: 'transform 0.15s', display: 'inline-block' }, '▸');
        descToggle.appendChild(arrow);
        descToggle.appendChild(el('span', {}, 'What each variable means'));

        const descBody = el('div', {
            fontSize: '10px', color: '#888', lineHeight: '1.5',
            marginTop: '6px', paddingLeft: '12px', display: 'none',
            borderLeft: '1px solid #1a1a34',
        }, eq.desc);

        descToggle.addEventListener('click', () => {
            const open = descBody.style.display !== 'none';
            descBody.style.display = open ? 'none' : 'block';
            arrow.textContent = open ? '▸' : '▾';
        });

        eqRow.appendChild(descToggle);
        eqRow.appendChild(descBody);

        eqRow.addEventListener('mouseenter', () => {
            eqRow.style.background = '#1a1a3a';
            eqRow.style.borderColor = '#ec489920';
        });
        eqRow.addEventListener('mouseleave', () => {
            eqRow.style.background = '#0e0e1e';
            eqRow.style.borderColor = 'transparent';
        });

        eqCard.appendChild(eqRow);
    });
    notesView.appendChild(eqCard);

    // ── Core Notes ──
    const coreCard = el('div', {
        padding: '14px', background: '#111125', borderRadius: '10px',
        border: '1px solid #1a1a34', marginBottom: '14px',
    });
    coreCard.appendChild(el('div', {
        fontSize: '9px', fontWeight: '700', textTransform: 'uppercase',
        letterSpacing: '1.2px', color: '#666', marginBottom: '10px',
    }, 'Core Notes'));

    source.notes.forEach((note: any, i: number) => {
        const style = noteStyles[note.type] || noteStyles.insight;

        const noteCard = el('div', {
            padding: '12px', background: '#0e0e1e', borderRadius: '8px',
            marginBottom: '6px', borderLeft: `2px solid ${style.color}`,
            transition: 'background 0.15s',
        });

        const noteTop = el('div', {
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: '8px',
        });
        const typeTag = el('div', { display: 'flex', alignItems: 'center', gap: '5px' });
        typeTag.appendChild(el('span', { fontSize: '8px', color: style.color }, style.icon));
        typeTag.appendChild(el('span', {
            fontSize: '8px', fontWeight: '700', color: style.color,
            textTransform: 'uppercase', letterSpacing: '0.8px',
        }, style.label));
        noteTop.appendChild(typeTag);
        noteTop.appendChild(el('span', { fontSize: '8px', color: '#333' }, `#${i + 1}`));
        noteCard.appendChild(noteTop);

        noteCard.appendChild(el('div', {
            fontSize: '11px', color: '#bbb', lineHeight: '1.6',
        }, note.text));

        noteCard.addEventListener('mouseenter', () => noteCard.style.background = '#1a1a3a');
        noteCard.addEventListener('mouseleave', () => noteCard.style.background = '#0e0e1e');

        coreCard.appendChild(noteCard);
    });
    notesView.appendChild(coreCard);

    // ── Worked Examples from Page ──
    const exCard = el('div', {
        padding: '14px', background: '#111125', borderRadius: '10px',
        border: '1px solid #1a1a34', marginBottom: '14px',
    });
    const exHeader = el('div', {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '10px',
    });
    exHeader.appendChild(el('div', {
        fontSize: '9px', fontWeight: '700', textTransform: 'uppercase',
        letterSpacing: '1.2px', color: '#666',
    }, 'Worked Examples'));
    exHeader.appendChild(el('div', {
        fontSize: '8px', color: '#10b981', fontWeight: '600',
        padding: '2px 6px', background: '#10b98115', borderRadius: '4px',
    }, 'From this page'));
    exCard.appendChild(exHeader);

    const examples = [
        {
            title: 'Calculate Magnetic Force',
            difficulty: 'Medium',
            diffColor: '#f59e0b',
            problem: 'A proton (q = 1.6 × 10⁻¹⁹ C) moves at 3 × 10⁶ m/s perpendicular to a 0.5 T magnetic field. Find the magnetic force on the proton.',
            steps: [
                'Identify: F = qvB sin(θ), where θ = 90° (perpendicular)',
                'Since sin(90°) = 1, simplify to F = qvB',
                'F = (1.6 × 10⁻¹⁹)(3 × 10⁶)(0.5)',
                'F = 2.4 × 10⁻¹³ N',
            ],
            answer: 'F = 2.4 × 10⁻¹³ N directed perpendicular to both velocity and field (right-hand rule).',
        },
        {
            title: 'Solenoid Field Strength',
            difficulty: 'Easy',
            diffColor: '#22c55e',
            problem: 'A solenoid has 200 turns over 0.5 m length carrying 3 A. Find the magnetic field inside.',
            steps: [
                'Use B = μ₀nI',
                'n = turns/length = 200/0.5 = 400 turns/m',
                'μ₀ = 4π × 10⁻⁷ T·m/A',
                'B = (4π × 10⁻⁷)(400)(3) = 1.51 × 10⁻³ T',
            ],
            answer: 'B ≈ 1.51 mT directed along the solenoid axis.',
        },
        {
            title: 'Magnetic Flux Through a Loop',
            difficulty: 'Hard',
            diffColor: '#ef4444',
            problem: 'A circular loop of radius 0.1 m is tilted at 30° to a uniform 0.2 T field. Calculate the magnetic flux.',
            steps: [
                'Φ = B · A · cos(θ), where θ is angle between field and normal to loop',
                'The loop is tilted 30° to the field, so angle to normal = 60°',
                'A = πr² = π(0.1)² = 0.0314 m²',
                'Φ = (0.2)(0.0314)(cos 60°) = (0.2)(0.0314)(0.5)',
                'Φ = 3.14 × 10⁻³ Wb',
            ],
            answer: 'Φ ≈ 3.14 mWb',
        },
    ];

    examples.forEach(ex => {
        const exBlock = el('div', {
            background: '#0e0e1e', borderRadius: '8px', marginBottom: '8px',
            border: '1px solid transparent', overflow: 'hidden',
            transition: 'border-color 0.15s',
        });

        // Example header
        const exTop = el('div', { padding: '12px 12px 10px' });
        const titleRow = el('div', {
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: '8px',
        });
        titleRow.appendChild(el('div', {
            fontSize: '11px', fontWeight: '700', color: '#ddd',
        }, ex.title));
        titleRow.appendChild(el('span', {
            fontSize: '7px', fontWeight: '700', color: ex.diffColor,
            background: ex.diffColor + '15', padding: '2px 6px',
            borderRadius: '4px', textTransform: 'uppercase',
        }, ex.difficulty));
        exTop.appendChild(titleRow);

        exTop.appendChild(el('div', {
            fontSize: '11px', color: '#999', lineHeight: '1.6',
            padding: '10px', background: '#080816', borderRadius: '6px',
            border: '1px solid #1a1a34',
        }, ex.problem));
        exBlock.appendChild(exTop);

        // Solution section (hidden by default)
        const solutionWrap = el('div', {
            display: 'none', padding: '0 12px 12px',
        });

        // Steps
        const stepsContainer = el('div', {
            marginBottom: '10px',
        });
        ex.steps.forEach((step, si) => {
            const stepRow = el('div', {
                display: 'flex', gap: '8px', alignItems: 'flex-start',
                marginBottom: '6px', padding: '6px 8px',
                background: '#111125', borderRadius: '6px',
            });
            stepRow.appendChild(el('span', {
                fontSize: '8px', fontWeight: '700', color: '#7c5cf7',
                background: '#7c5cf715', padding: '2px 5px',
                borderRadius: '4px', flexShrink: '0', marginTop: '1px',
            }, `${si + 1}`));
            stepRow.appendChild(el('span', {
                fontSize: '10px', color: '#bbb', lineHeight: '1.5',
                fontFamily: '"Cambria Math", "Latin Modern Math", Georgia, serif',
            }, step));
            stepsContainer.appendChild(stepRow);
        });
        solutionWrap.appendChild(stepsContainer);

        // Final answer
        const answerBox = el('div', {
            padding: '10px 12px', background: '#22c55e10',
            border: '1px solid #22c55e30', borderRadius: '6px',
        });
        const ansLabel = el('div', {
            display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px',
        });
        ansLabel.appendChild(el('span', { fontSize: '9px', color: '#22c55e' }, '✓'));
        ansLabel.appendChild(el('span', {
            fontSize: '8px', fontWeight: '700', color: '#22c55e',
            textTransform: 'uppercase', letterSpacing: '0.8px',
        }, 'Final Answer'));
        answerBox.appendChild(ansLabel);
        answerBox.appendChild(el('div', {
            fontSize: '11px', color: '#4ade80', lineHeight: '1.5',
            fontFamily: '"Cambria Math", "Latin Modern Math", Georgia, serif',
        }, ex.answer));
        solutionWrap.appendChild(answerBox);
        exBlock.appendChild(solutionWrap);

        // Action buttons
        const btnRow = el('div', {
            display: 'flex', gap: '4px', padding: '0 12px 12px',
        });

        const solveBtn = el('div', {
            flex: '1', padding: '7px', textAlign: 'center',
            background: '#7c5cf715', border: '1px solid #7c5cf730',
            borderRadius: '6px', color: '#a78bfa', fontSize: '9px',
            fontWeight: '700', cursor: 'pointer', transition: 'all 0.15s',
        }, '✦ Try it yourself');

        const showBtn = el('div', {
            flex: '1', padding: '7px', textAlign: 'center',
            background: '#3b82f615', border: '1px solid #3b82f630',
            borderRadius: '6px', color: '#60a5fa', fontSize: '9px',
            fontWeight: '700', cursor: 'pointer', transition: 'all 0.15s',
        }, '👁 Show Solution');

        let solutionVisible = false;
        showBtn.addEventListener('click', () => {
            solutionVisible = !solutionVisible;
            solutionWrap.style.display = solutionVisible ? 'block' : 'none';
            showBtn.textContent = solutionVisible ? '✕ Hide Solution' : '👁 Show Solution';
            showBtn.style.background = solutionVisible ? '#ef444415' : '#3b82f615';
            showBtn.style.borderColor = solutionVisible ? '#ef444430' : '#3b82f630';
            showBtn.style.color = solutionVisible ? '#f87171' : '#60a5fa';
            exBlock.style.borderColor = solutionVisible ? '#7c5cf720' : 'transparent';
        });

        solveBtn.addEventListener('click', () => {
            document.dispatchEvent(new CustomEvent('eduai-practice-concept', {
                detail: { concept: ex.title },
            }));
        });

        [solveBtn, showBtn].forEach(b => {
            b.addEventListener('mouseenter', () => b.style.opacity = '0.8');
            b.addEventListener('mouseleave', () => b.style.opacity = '1');
        });

        btnRow.appendChild(solveBtn);
        btnRow.appendChild(showBtn);
        exBlock.appendChild(btnRow);

        exCard.appendChild(exBlock);
    });
    notesView.appendChild(exCard);

    // ── Concept Map (visual connections) ──
    const mapCard = el('div', {
        padding: '14px', background: '#111125', borderRadius: '10px',
        border: '1px solid #1a1a34', marginBottom: '14px',
    });
    mapCard.appendChild(el('div', {
        fontSize: '9px', fontWeight: '700', textTransform: 'uppercase',
        letterSpacing: '1.2px', color: '#666', marginBottom: '12px',
    }, 'Concepts on this Page'));

    const conceptNodes = [
        { name: 'Electron Spin', status: 'learned', connections: 2 },
        { name: 'Magnetic Domains', status: 'learned', connections: 3 },
        { name: 'Ferromagnetic Materials', status: 'new', connections: 1 },
        { name: 'Magnetic Force', status: 'new', connections: 2 },
        { name: 'Electromagnetic Induction', status: 'upcoming', connections: 1 },
    ];

    const statusConfig: Record<string, { bg: string; border: string; dot: string }> = {
        learned:  { bg: '#22c55e10', border: '#22c55e40', dot: '#22c55e' },
        new:      { bg: '#3b82f610', border: '#3b82f640', dot: '#3b82f6' },
        upcoming: { bg: '#1a1a34',   border: '#333',      dot: '#444' },
    };

    // Visual node layout
    const nodeGrid = el('div', {
        display: 'flex', flexDirection: 'column', gap: '4px',
    });

    conceptNodes.forEach((node, i) => {
        const cfg = statusConfig[node.status];
        const nodeRow = el('div', {
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '8px 10px', background: cfg.bg,
            borderRadius: '8px', border: `1px solid ${cfg.border}`,
            transition: 'all 0.15s', cursor: 'pointer',
        });

        // Connection line to previous
        const leftCol = el('div', {
            width: '20px', display: 'flex', flexDirection: 'column',
            alignItems: 'center', flexShrink: '0',
        });
        leftCol.appendChild(el('div', {
            width: '10px', height: '10px', borderRadius: '50%',
            background: cfg.dot, border: `2px solid ${cfg.border}`,
        }));
        nodeRow.appendChild(leftCol);

        const textCol = el('div', { flex: '1' });
        textCol.appendChild(el('div', {
            fontSize: '11px', fontWeight: '600',
            color: node.status === 'upcoming' ? '#555' : '#ddd',
        }, node.name));
        textCol.appendChild(el('div', {
            fontSize: '8px', color: '#555', marginTop: '2px',
        }, `${node.connections} connection${node.connections !== 1 ? 's' : ''}`));
        nodeRow.appendChild(textCol);

        nodeRow.appendChild(el('span', {
            fontSize: '7px', fontWeight: '700',
            color: cfg.dot, textTransform: 'uppercase',
            padding: '2px 5px', background: cfg.bg,
            borderRadius: '4px', border: `1px solid ${cfg.border}`,
        }, node.status));

        nodeRow.addEventListener('mouseenter', () => {
            nodeRow.style.transform = 'translateX(4px)';
        });
        nodeRow.addEventListener('mouseleave', () => {
            nodeRow.style.transform = 'translateX(0)';
        });

        nodeGrid.appendChild(nodeRow);

        // Connector line between nodes
        if (i < conceptNodes.length - 1) {
            const connector = el('div', {
                width: '1px', height: '8px', background: '#1a1a34',
                marginLeft: '14px',
            });
            nodeGrid.appendChild(connector);
        }
    });

    mapCard.appendChild(nodeGrid);

    // Legend
    const mapLegend = el('div', {
        display: 'flex', gap: '12px', marginTop: '12px',
        paddingTop: '10px', borderTop: '1px solid #1a1a34',
    });
    [
        { color: '#22c55e', label: 'Learned' },
        { color: '#3b82f6', label: 'New' },
        { color: '#444', label: 'Upcoming' },
    ].forEach(l => {
        const item = el('div', { display: 'flex', alignItems: 'center', gap: '4px' });
        item.appendChild(el('span', {
            width: '6px', height: '6px', borderRadius: '50%',
            background: l.color, display: 'inline-block',
        }));
        item.appendChild(el('span', { fontSize: '8px', color: '#555' }, l.label));
        mapLegend.appendChild(item);
    });
    mapCard.appendChild(mapLegend);
    notesView.appendChild(mapCard);

    // ── Comprehension Check ──
    const quizCard = el('div', {
        padding: '14px', background: '#111125', borderRadius: '10px',
        border: '1px solid #1a1a34', marginBottom: '14px',
    });
    quizCard.appendChild(el('div', {
        fontSize: '9px', fontWeight: '700', textTransform: 'uppercase',
        letterSpacing: '1.2px', color: '#666', marginBottom: '4px',
    }, 'Quick Comprehension Check'));
    quizCard.appendChild(el('div', {
        fontSize: '9px', color: '#444', marginBottom: '12px',
    }, 'Test yourself on what you read'));

    const quizQuestions = [
        {
            q: 'Why don\'t all materials exhibit magnetism even though they contain electrons?',
            a: 'In most atoms, electron magnetic fields are paired up and cancel each other out. Only atoms with unpaired electrons in outer shells can contribute to magnetism.',
        },
        {
            q: 'What must happen for a material to become a permanent magnet?',
            a: 'The magnetic domains — small regions of aligned atoms — must be forced into alignment using a strong external magnetic field, and the alignment must persist after the field is removed.',
        },
        {
            q: 'What is the relationship between magnetic force and the velocity of a charged particle?',
            a: 'Magnetic force is perpendicular to both velocity and field direction (F = qv × B). Crucially, magnetic fields change direction but never speed — they do no work on the particle.',
        },
    ];

    quizQuestions.forEach((qq, qi) => {
        const qBlock = el('div', {
            padding: '12px', background: '#0e0e1e', borderRadius: '8px',
            marginBottom: '6px', border: '1px solid transparent',
            transition: 'border-color 0.15s',
        });

        const qHeader = el('div', {
            display: 'flex', gap: '8px', alignItems: 'flex-start',
            marginBottom: '8px',
        });
        qHeader.appendChild(el('span', {
            fontSize: '9px', fontWeight: '700', color: '#f59e0b',
            background: '#f59e0b15', padding: '2px 6px',
            borderRadius: '4px', flexShrink: '0',
        }, `Q${qi + 1}`));
        qHeader.appendChild(el('div', {
            fontSize: '11px', color: '#ddd', lineHeight: '1.5', fontWeight: '600',
        }, qq.q));
        qBlock.appendChild(qHeader);

        const answerBlock = el('div', {
            display: 'none', padding: '10px 12px',
            background: '#111125', borderRadius: '6px',
            borderLeft: '2px solid #22c55e', marginBottom: '8px',
        });
        answerBlock.appendChild(el('div', {
            fontSize: '10px', color: '#999', lineHeight: '1.6',
        }, qq.a));

        const revealBtn = el('div', {
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '6px', padding: '6px', background: '#f59e0b10',
            border: '1px solid #f59e0b25', borderRadius: '6px',
            fontSize: '9px', fontWeight: '700', color: '#f59e0b',
            cursor: 'pointer', transition: 'all 0.15s',
        });
        revealBtn.appendChild(el('span', {}, '💡'));
        revealBtn.appendChild(el('span', {}, 'Reveal Answer'));

        let revealed = false;
        revealBtn.addEventListener('click', () => {
            revealed = !revealed;
            answerBlock.style.display = revealed ? 'block' : 'none';
            revealBtn.innerHTML = '';
            revealBtn.appendChild(el('span', {}, revealed ? '✕' : '💡'));
            revealBtn.appendChild(el('span', {}, revealed ? 'Hide Answer' : 'Reveal Answer'));
            qBlock.style.borderColor = revealed ? '#f59e0b20' : 'transparent';
        });

        revealBtn.addEventListener('mouseenter', () => revealBtn.style.opacity = '0.8');
        revealBtn.addEventListener('mouseleave', () => revealBtn.style.opacity = '1');

        qBlock.appendChild(answerBlock);
        qBlock.appendChild(revealBtn);
        quizCard.appendChild(qBlock);
    });
    notesView.appendChild(quizCard);

    // ── Type Legend ──
    const legend = el('div', {
        display: 'flex', flexWrap: 'wrap', gap: '8px',
        padding: '10px', background: '#0e0e1e', borderRadius: '8px',
    });
    Object.entries(noteStyles).forEach(([_, style]) => {
        const item = el('div', { display: 'flex', alignItems: 'center', gap: '4px' });
        item.appendChild(el('span', { fontSize: '7px', color: style.color }, style.icon));
        item.appendChild(el('span', { fontSize: '8px', color: '#555' }, style.label));
        legend.appendChild(item);
    });
    notesView.appendChild(legend);

    area.appendChild(notesView);
}


export function renderSummary(area: HTMLElement, data: any) {
    const wrap = el('div', { padding: '4px 14px 14px' });

    // ── Overview Card ──
    const overviewCard = el('div', {
        padding: '14px', background: '#111125', borderRadius: '10px',
        border: '1px solid #1a1a34', marginBottom: '12px',
    });
    const overviewHeader = el('div', {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '10px',
    });
    overviewHeader.appendChild(el('div', {
        fontSize: '9px', fontWeight: '700', textTransform: 'uppercase',
        letterSpacing: '1.2px', color: '#666',
    }, 'Overview'));
    overviewHeader.appendChild(el('div', {
        fontSize: '8px', color: '#7c5cf7', fontWeight: '600',
        padding: '2px 6px', background: '#7c5cf715', borderRadius: '4px',
    }, '✦ AI Generated'));
    overviewCard.appendChild(overviewHeader);

    if (data && data.summary) {
        overviewCard.appendChild(el('p', {
            fontSize: '12px', lineHeight: '1.7', color: '#999', margin: '0',
        }, data.summary));
    } else {
        overviewCard.appendChild(el('p', {
            fontSize: '11px', color: '#444', margin: '0', fontStyle: 'italic',
        }, 'Analyze a page about this topic to generate an overview.'));
    }
    wrap.appendChild(overviewCard);

    // ── Key Points ──
    const keyPoints = data?.keyConcepts || data?.key_concepts || [];
    if (keyPoints.length > 0) {
        const kpCard = el('div', {
            padding: '14px', background: '#111125', borderRadius: '10px',
            border: '1px solid #1a1a34', marginBottom: '12px',
        });
        kpCard.appendChild(el('div', {
            fontSize: '9px', fontWeight: '700', textTransform: 'uppercase',
            letterSpacing: '1.2px', color: '#666', marginBottom: '10px',
        }, 'Key Points'));

        keyPoints.forEach((point: string) => {
            const row = el('div', {
                display: 'flex', gap: '8px', alignItems: 'flex-start',
                marginBottom: '8px', padding: '8px 10px',
                background: '#0e0e1e', borderRadius: '6px',
                transition: 'background 0.15s',
            });
            row.addEventListener('mouseenter', () => row.style.background = '#1a1a3a');
            row.addEventListener('mouseleave', () => row.style.background = '#0e0e1e');
            row.appendChild(el('span', {
                color: '#7c5cf7', fontSize: '8px', marginTop: '3px', flexShrink: '0',
            }, '◆'));
            row.appendChild(el('span', {
                fontSize: '11px', color: '#bbb', lineHeight: '1.5',
            }, point));
            kpCard.appendChild(row);
        });
        wrap.appendChild(kpCard);
    }

    // ── Notes by Source ──
    const notesCard = el('div', {
        padding: '14px', background: '#111125', borderRadius: '10px',
        border: '1px solid #1a1a34', marginBottom: '12px',
    });
    const notesHeader = el('div', {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '12px',
    });
    notesHeader.appendChild(el('div', {
        fontSize: '9px', fontWeight: '700', textTransform: 'uppercase',
        letterSpacing: '1.2px', color: '#666',
    }, 'Notes by Source'));
    notesHeader.appendChild(el('div', {
        fontSize: '9px', color: '#444', fontWeight: '500',
    }, '2 pages'));
    notesCard.appendChild(notesHeader);

    // Mock source entries
    const mockSources = [
        {
            hostname: 'mathsisfun.com',
            path: '/physics/magnetism.html',
            time: '2d ago',
            noteCount: 4,
            notes: [
                { type: 'definition', text: 'Magnetism comes from the spin of electrons — a built-in property that makes them act like tiny magnets.' },
                { type: 'insight', text: 'In most atoms, electron magnetic fields cancel out. Only unpaired outer-shell electrons contribute.' },
                { type: 'term', text: 'Ferromagnetic materials: metals (iron, nickel, cobalt) where atomic magnetic fields naturally align.' },
                { type: 'process', text: 'Permanent magnets form when magnetic domains are forced to align using a strong external field, and the alignment persists.' },
            ],
        },
        {
            hostname: 'khanacademy.org',
            path: '/science/physics/magnetism',
            time: '5d ago',
            noteCount: 3,
            notes: [
                { type: 'formula', text: 'Magnetic force: F = qv × B (cross product of charge velocity and field).' },
                { type: 'insight', text: 'Magnetic fields do no work — they change direction of motion but never speed.' },
                { type: 'connection', text: 'Electromagnetism unifies electric and magnetic forces — a changing electric field creates a magnetic field and vice versa.' },
            ],
        },
    ];

    const NOTE_TYPE_STYLES: Record<string, { icon: string; color: string; label: string }> = {
        definition:  { icon: '■', color: '#7c5cf7', label: 'Definition' },
        insight:     { icon: '◆', color: '#f59e0b', label: 'Insight' },
        term:        { icon: '●', color: '#22c55e', label: 'Term' },
        process:     { icon: '▸', color: '#3b82f6', label: 'Process' },
        formula:     { icon: '∑', color: '#ec4899', label: 'Formula' },
        connection:  { icon: '⟷', color: '#14b8a6', label: 'Connection' },
    };

    mockSources.forEach(source => {
        const sourceCard = el('div', {
            padding: '10px 12px', background: '#0e0e1e', borderRadius: '8px',
            marginBottom: '6px', cursor: 'pointer', transition: 'all 0.15s',
            border: '1px solid transparent',
        });

        const sourceTop = el('div', {
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: '4px',
        });
        const sourceInfo = el('div', { display: 'flex', alignItems: 'center', gap: '6px' });
        sourceInfo.appendChild(el('span', { fontSize: '9px' }, '🔗'));
        sourceInfo.appendChild(el('div', {
            fontSize: '10px', fontWeight: '600', color: '#a78bfa',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }, source.hostname));
        sourceTop.appendChild(sourceInfo);

        const sourceRight = el('div', { display: 'flex', alignItems: 'center', gap: '8px' });
        sourceRight.appendChild(el('span', {
            fontSize: '8px', color: '#444',
        }, source.time));
        sourceRight.appendChild(el('span', {
            fontSize: '8px', color: '#555', background: '#1a1a34',
            padding: '1px 5px', borderRadius: '4px', fontWeight: '600',
        }, `${source.noteCount} notes`));
        sourceTop.appendChild(sourceRight);
        sourceCard.appendChild(sourceTop);

        sourceCard.appendChild(el('div', {
            fontSize: '9px', color: '#444',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }, source.path));

        // Preview first note
        const preview = el('div', {
            display: 'flex', gap: '6px', alignItems: 'flex-start',
            marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #1a1a3440',
        });
        const firstNote = source.notes[0];
        const noteStyle = NOTE_TYPE_STYLES[firstNote.type] || NOTE_TYPE_STYLES.insight;
        preview.appendChild(el('span', {
            color: noteStyle.color, fontSize: '7px', marginTop: '3px', flexShrink: '0',
        }, noteStyle.icon));
        preview.appendChild(el('span', {
            fontSize: '10px', color: '#666', lineHeight: '1.4',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }, firstNote.text));
        sourceCard.appendChild(preview);

        sourceCard.addEventListener('mouseenter', () => {
            sourceCard.style.background = '#1a1a3a';
            sourceCard.style.borderColor = '#7c5cf720';
        });
        sourceCard.addEventListener('mouseleave', () => {
            sourceCard.style.background = '#0e0e1e';
            sourceCard.style.borderColor = 'transparent';
        });

        // Open notes UI on click
        sourceCard.addEventListener('click', () => {
            openNotesView(area, wrap, source, NOTE_TYPE_STYLES);
        });

        notesCard.appendChild(sourceCard);
    });

    wrap.appendChild(notesCard);

    // ── Learning Timeline ──
    const timelineCard = el('div', {
        padding: '14px', background: '#111125', borderRadius: '10px',
        border: '1px solid #1a1a34',
    });
    timelineCard.appendChild(el('div', {
        fontSize: '9px', fontWeight: '700', textTransform: 'uppercase',
        letterSpacing: '1.2px', color: '#666', marginBottom: '12px',
    }, 'Learning Timeline'));

    const milestones = [
        { label: 'First encountered', time: '5d ago', icon: '👁', done: true },
        { label: 'Explored 2 sources', time: '2d ago', icon: '📖', done: true },
        { label: 'First explanation used', time: '2d ago', icon: '✦', done: true },
        { label: 'Practice problems attempted', time: '', icon: '🎯', done: false },
        { label: 'Mastery quiz passed', time: '', icon: '🏆', done: false },
    ];

    milestones.forEach((m, i) => {
        const row = el('div', {
            display: 'flex', gap: '10px', alignItems: 'flex-start',
            position: 'relative', paddingBottom: i < milestones.length - 1 ? '16px' : '0',
        });

        // Vertical line
        if (i < milestones.length - 1) {
            row.appendChild(el('div', {
                position: 'absolute', left: '9px', top: '20px',
                width: '1px', height: 'calc(100% - 10px)',
                background: m.done ? '#7c5cf740' : '#1a1a34',
            }));
        }

        // Dot
        row.appendChild(el('div', {
            width: '20px', height: '20px', borderRadius: '50%',
            background: m.done ? '#7c5cf720' : '#0e0e1e',
            border: m.done ? '1.5px solid #7c5cf7' : '1.5px solid #1a1a34',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '9px', flexShrink: '0', zIndex: '1',
        }, m.icon));

        const textCol = el('div', { flex: '1', paddingTop: '1px' });
        textCol.appendChild(el('div', {
            fontSize: '10px', fontWeight: '600',
            color: m.done ? '#ccc' : '#444',
        }, m.label));
        if (m.time) {
            textCol.appendChild(el('div', {
                fontSize: '8px', color: '#555', marginTop: '1px',
            }, m.time));
        }
        row.appendChild(textCol);

        if (m.done) {
            row.appendChild(el('span', {
                fontSize: '10px', color: '#22c55e', flexShrink: '0', marginTop: '2px',
            }, '✓'));
        }

        timelineCard.appendChild(row);
    });

    wrap.appendChild(timelineCard);
    area.appendChild(wrap);
}
