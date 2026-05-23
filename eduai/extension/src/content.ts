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

function createHeader(text: string) {
    const heading = document.createElement('h1');
    heading.textContent = text;
    heading.style.fontSize = '24px';
    heading.style.color = 'white';

    return heading;
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
    const sidebarHeader = createHeader('EduAI');
    sidebar.appendChild(sidebarHeader);

    const metadata = extractWithReadability();

    document.body.style.marginRight = '350px';
    document.body.appendChild(sidebar);

    const button = renderAnalyzeButton();
    renderHeader(sidebar);

    sidebar.appendChild(button);  
    sidebar.append(el('p', { marginTop: '8px', fontSize: '12px', color: '#ccc' }, 'AI analysis may take a moment.'));


    button.addEventListener('click', async () => {
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
                const resultDiv = document.createElement('div');
                resultDiv.style.marginTop = '16px';
                resultDiv.textContent = `AI Analysis: `;
                sidebar.appendChild(resultDiv);

                const decoder = new TextDecoder();

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    const chunk = decoder.decode(value);
                    console.log('Received chunk:', chunk);
                    
                    resultDiv.textContent += chunk;
                }
            }

            generate();
        }
    });
}

initialize();