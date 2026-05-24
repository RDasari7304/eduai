import { Readability } from "@mozilla/readability";


const viewedContent: string[] = [];

// K extends keyof HTMLElementTagNameMap ensures that the tagNameL is a valid HTML tag
// Return type is inferred to be the corresponding HTMLElement type based on the tag name
function el<K extends keyof HTMLElementTagNameMap>(tagNameL: K, 
    style: Partial<CSSStyleDeclaration>, 
    textContent?: string) {

    const node = document.createElement(tagNameL);
    Object.assign(node.style, style);
    if (textContent) {
        node.textContent = textContent;
    }

    return node;
}

function createBadge(text:string, bg: string) {
    return el('span', {
        display: 'inline-block',
        padding: '3px 10px',
        borderRadius: '12px',
        fontSize: '11px',
        fontWeight: '600',
        letterSpacing: '0.5px',
        background: bg,
        color: '#fff',
        marginRight: '6px',
        marginTop: '6px',
        marginBottom : '6px',
        textTransform: 'uppercase',
    }, text);
}


function createSidebar() {

    const sidebarDiv = el('div', {
        position: 'fixed',
        top: '0',
        right: '0',
        width: '350px',
        height: '100vh',
        background: '#13131f', 
        zIndex: '10000', // Ensure the sidebar is on top of other content
        boxShadow: '-2px 0 10px rgba(0, 0, 0, 0.45)', // Add a subtle shadow for depth
        padding: '16px', // Add some padding for content
        color: 'white', // Default text color
        fontFamily: 'Arial, sans-serif', // Use a clean, readable font
        overflow: 'auto', // Allow scrolling if content exceeds viewport height
        boxSizing: 'border-box',  // Ensure padding is included in width/height calculations
        display: 'flex', // Use flexbox for layout
        flexDirection: 'column', // Stack children vertically
        gap: '0px' // Add some space between children
    });

    return sidebarDiv;
}

function renderAnalyzeButton(): HTMLButtonElement {
    const button = el('button', {
        padding: '12px 24px',
        background: 'linear-gradient(135deg, #6c5ce7, #0984e3)',
        color: '#fff',
        border: 'none',
        borderRadius: '8px',
        fontSize: '13px',
        fontWeight: '700',
        cursor: 'pointer',
        letterSpacing: '0.3px',
        width: '100%',
        marginTop: '16px',
        transition: 'opacity 0.15s ease',
    }, '✦  Analyze Content');

    button.addEventListener('mouseover', () => {
        button.style.opacity = '0.85';
    });

    button.addEventListener('mouseout', () => {
        button.style.opacity = '1';
    });

    return button;
}

function renderHeader(sidebar: HTMLElement) {
    const brand = el('div', {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '4px'
    });

    const logo = el('span', {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '32px',
        height: '32px',
        borderRadius: '8px',
        background: 'linear-gradient(135deg, #6c5ce7, #0984e3)',
        fontSize: '16px',
        fontWeight: '800',
        color: '#fff',
    }, 'E');

    const title = el('span', {
        fontSize: '18px',
        fontWeight: '700',
        color: '#fff',
    }, 'EduAI');

    brand.appendChild(logo);
    brand.appendChild(title);
    sidebar.appendChild(brand);

    const subtitle = el('p', {
        fontSize: '12px',
        color: '#666',
        margin: '2px 0 16px 0'
    }, 'Your contextual learning assistant');


    sidebar.appendChild(subtitle);

    const divider = el('div', {
        height: '1px',
        background: '#333',
        marginBottom: '0 0 8px 0'
    });

    sidebar.appendChild(divider);
}

function renderLoadingIndicator(contentDiv: HTMLElement) : HTMLElement {
    const loadingdiv = el('div', {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 0',
        gap: '16px'
    });

    const spinner = el('div', {
        width: '24px',
        height: '24px',
        border: '3px solid #333',
        borderTop: '3px solid #6c5ce7',
        borderRadius: '50%',
    });

    const styleTag = document.createElement('style');
    styleTag.textContent = `
        @keyframes eduai-spin { to { transform: rotate(360deg); } }
        #eduai-spinner { animation: eduai-spin 0.8s linear infinite; }
    `;

    document.head.appendChild(styleTag);
    spinner.id = 'eduai-spinner';

    const loadingText = el('p', {
        fontSize: '13px',
        color: '#666',
    }, 'Analyzing...');

    loadingdiv.appendChild(spinner);
    loadingdiv.appendChild(loadingText);
    contentDiv.appendChild(loadingdiv);

    return loadingdiv;
}

// Parse function to understand json response object
function parseAIResponse(responseText: string): any {
    try {
        const json = JSON.parse(responseText);
        return json;
    } catch (error) {
        console.error('Error parsing AI response:', error);
    }

    const strippedResponse = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '')

    try {
        const json = JSON.parse(strippedResponse);
        return json;
    } catch (error) {   
        console.error('Error parsing AI response after stripping markdown:', error);
    }

    const substringStrippedResponse = strippedResponse.substring(strippedResponse.indexOf('{'), strippedResponse.lastIndexOf('}') + 1);

    try {
        const json = JSON.parse(substringStrippedResponse);
        return json;
    } catch (error) {   
        console.error('Error parsing AI response after stripping to substring:', error);
        return null;
    }
}

// Rendering the actual content

function renderTopicSummary(contentDiv: HTMLElement, data: any){
    const topicRow = el ('div', {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginTop: '16px',
        flexWrap: 'wrap'
    });

    const topicHeading = el('h2', {
        fontSize: '20px',
        fontWeight: '700',
        color: '#fff',
        margin: '0'
    }, data.topic || 'Unknown Topic');

    topicRow.append(topicHeading);
    if (data.subject) topicRow.appendChild(createBadge(data.subject, '#6c5ce7'));
    contentDiv.append(topicRow);

    if (data.summary){
        const summary = el('p', {
            fontSize: '13px',
            lineHeight: '1.6',
            color: '#bbb',
            margin: '12px 0 0 0',
            padding: '12px',
            background: '#1a1a2e',
            borderRadius: '8px',
            borderLeft: '3px solid #6c5ce7',
        }, data.summary);
        contentDiv.appendChild(summary);
    }

}

function sectionTitle(text: string): HTMLHeadingElement{
    return el('h3', {
        fontSize: '11px',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: '1.2px',
        color: '#888',
        margin: '20px 0 10px 0',
        padding: '0',
    }, text);
}

function renderKeyConcepts(contentDiv: HTMLElement, concepts: any[]){
    if (!concepts || concepts.length == 0) return;

    contentDiv.appendChild(sectionTitle('Key Concepts'));
    
    const list = el('div', {display: 'flex', flexDirection: 'column', gap: '6px'});

    concepts.forEach((concept:any) => {
        const item = el('div', {
            padding: '10px 12px',
            background: '#1a1a2e',
            borderRadius: '6px',
            fontSize: '13px',
            lineHeight: '1.5'
        });

        const term = typeof concept === 'string' ? concept : (concept.term || concept.name || '');
        const def = typeof concept == 'string' ? '' : (concept.definition || concept.description || '');

        const termEl = el('span', {fontWeight: '600', color: '#a29bfe'}, term);
        item.appendChild(termEl);

        if (def) {
            const defEl = el('span', {color: '#999'}, `- ${def}`)
            item.appendChild(defEl);
        }

        list.appendChild(item);
    });

    contentDiv.appendChild(list);
}

function renderFlashcards(contentDiv: HTMLElement, flashcards: any[]) {
    if (!flashcards || flashcards.length === 0) return;
 
    contentDiv.appendChild(sectionTitle('Flashcards'));
 
    let currentIndex = 0;
    let showingFront = true;
 
    const container = el('div', {});
 
    // Card
    const card = el('div', {
        padding: '20px',
        background: 'linear-gradient(135deg, #1e1e3a, #252547)',
        borderRadius: '12px',
        minHeight: '100px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        cursor: 'pointer',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        border: '1px solid #333',
        textAlign: 'center',
    });
 
    const sideLabel = el('span', {
        fontSize: '10px',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: '1px',
        color: '#6c5ce7',
        marginBottom: '10px',
    }, 'QUESTION');
 
    const cardText = el('p', {
        fontSize: '14px',
        lineHeight: '1.6',
        color: '#e2e2e2',
        margin: '0',
    }, flashcards[0].front || '');
 
    card.appendChild(sideLabel);
    card.appendChild(cardText);
 
    const flipHint = el('p', {
        fontSize: '11px',
        color: '#555',
        margin: '8px 0 0 0',
        textAlign: 'center',
    }, 'Click card to flip');
 
    function updateCard() {
        const fc = flashcards[currentIndex];
        showingFront = true;
        sideLabel.textContent = 'QUESTION';
        sideLabel.style.color = '#6c5ce7';
        cardText.textContent = fc.front || '';
        card.style.borderColor = '#333';
        counter.textContent = `${currentIndex + 1} / ${flashcards.length}`;
    }
 
    card.addEventListener('click', () => {
        const fc = flashcards[currentIndex];
        showingFront = !showingFront;
        if (showingFront) {
            sideLabel.textContent = 'QUESTION';
            sideLabel.style.color = '#6c5ce7';
            cardText.textContent = fc.front || '';
            card.style.borderColor = '#333';
        } else {
            sideLabel.textContent = 'ANSWER';
            sideLabel.style.color = '#00b894';
            cardText.textContent = fc.back || '';
            card.style.borderColor = '#00b89440';
        }
    });
 
    card.addEventListener('mouseenter', () => {
        card.style.transform = 'scale(1.01)';
        card.style.boxShadow = '0 4px 20px rgba(108,92,231,0.15)';
    });
    card.addEventListener('mouseleave', () => {
        card.style.transform = 'scale(1)';
        card.style.boxShadow = 'none';
    });
 
    // Controls
    const controls = el('div', {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: '10px',
    });
 
    const btnStyle: Partial<CSSStyleDeclaration> = {
        padding: '6px 16px',
        fontSize: '12px',
        fontWeight: '600',
        border: '1px solid #333',
        borderRadius: '6px',
        background: '#1a1a2e',
        color: '#ccc',
        cursor: 'pointer',
    };
 
    const prevBtn = el('button', btnStyle, '← Prev');
    const counter = el('span', { fontSize: '12px', color: '#666' }, `1 / ${flashcards.length}`);
    const nextBtn = el('button', btnStyle, 'Next →');
 
    prevBtn.addEventListener('click', () => {
        if (currentIndex > 0) { currentIndex--; updateCard(); }
    });
    nextBtn.addEventListener('click', () => {
        if (currentIndex < flashcards.length - 1) { currentIndex++; updateCard(); }
    });
 
    controls.appendChild(prevBtn);
    controls.appendChild(counter);
    controls.appendChild(nextBtn);
 
    container.appendChild(card);
    container.appendChild(flipHint);
    container.appendChild(controls);
    contentDiv.appendChild(container);
}

function renderResources(contentDiv: HTMLElement, topic: string){
    if (!topic) return;

    contentDiv.append(sectionTitle('Resources'));

    const linkContainer = el('div', {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
    });

    const ytQuery = encodeURIComponent(`${topic} explained`);
    const quizletQuery = encodeURIComponent(topic)

    const ytLink = el('a', {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 14px',
        background: '#1a1a2e',
        borderRadius: '8px',
        color: '#ff6b6b',
        fontSize: '13px',
        fontWeight: '600',
        textDecoration: 'none',
        border: '1px solid #333',
    }, '▶  Search YouTube');

    ytLink.setAttribute('href',`https://www.youtube.com/results?search_query=${ytQuery}`);
    ytLink.setAttribute('target', '_blank');
    
    const qlLink = el('a', {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 14px',
        background: '#1a1a2e',
        borderRadius: '8px',
        color: '#4ecdc4',
        fontSize: '13px',
        fontWeight: '600',
        textDecoration: 'none',
        border: '1px solid #333',
    }, '📚  Search Quizlet');
    qlLink.setAttribute('href', `https://quizlet.com/search?query=${quizletQuery}`);
    qlLink.setAttribute('target', '_blank');

    linkContainer.appendChild(ytLink);
    linkContainer.appendChild(qlLink);

    contentDiv.append(linkContainer);

}


function extractWithReadability() {
    const title = document.title;
    const full_url = window.location.href;
    const hostname  = window.location.hostname;
    const path_name = window.location.pathname;

    // Readability modifies the document, so we need to clone it first
    const clone = document.cloneNode(true) as Document;

    const reader = new Readability(clone);
    const article = reader.parse();

    const contentElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6');
    const options = {
        root: null,
        rootMargin: '0px 0px 200px 0px',
        threshold: 0.5
    }

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                console.log('Viewing content:', entry.target.textContent);
                const e = entry.target as HTMLElement;
                viewedContent.push(`${e.tagName}: ${e.textContent}` || '');
            };
        });
    };
    const observer = new IntersectionObserver(observerCallback, options);
    contentElements.forEach(el => observer.observe(el));

    return {
        title: title,
        full_url: full_url,
        hostname: hostname,
        path_name: path_name,
        textContent: article ? article.textContent : undefined
    };

}


function initialize() {
    const sidebar = createSidebar();

    const metadata = extractWithReadability();

    document.body.style.marginRight = '350px';
    document.body.appendChild(sidebar);

    const button = renderAnalyzeButton();
    renderHeader(sidebar);

    const contentDiv = el('div', {
        display :'flex',
        flexDirection: 'column'
    });
    sidebar.appendChild(contentDiv);
    sidebar.appendChild(button);  

    button.addEventListener('click', async () => {
        const loader = renderLoadingIndicator(contentDiv);

        const response = await fetch('http://localhost:8000/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ...metadata,
                frameContent: viewedContent.join('\n\n')
            })
        });

        if (response.body) {
            const reader = response.body.getReader();
            async function generate() {
                // const resultDiv = document.createElement('div');
                // resultDiv.style.marginTop = '16px';
                // resultDiv.textContent = `AI Analysis: `;
                // sidebar.appendChild(resultDiv);

                const decoder = new TextDecoder();
                let jsonResp = "";

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    const chunk = decoder.decode(value);
                    console.log('Received chunk:', chunk);
                    jsonResp += chunk;
                    
                    //resultDiv.textContent += chunk;
                }

                contentDiv.removeChild(loader);
                const parsedResponse = parseAIResponse(jsonResp);
                renderTopicSummary(contentDiv, parsedResponse);
                renderKeyConcepts(contentDiv, parsedResponse.keyConcepts);
                renderFlashcards(contentDiv, parsedResponse.flashcards);
                renderResources(contentDiv, parsedResponse.topic);
            }

            generate();
        }
    });
}

initialize();