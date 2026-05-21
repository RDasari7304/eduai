import { Readability } from "@mozilla/readability";

function createSidebar() {
    const sidebarDiv = document.createElement('div');
    sidebarDiv.id = 'eduai-sidebar';

    sidebarDiv.style.position = 'fixed';
    sidebarDiv.style.top = '0';
    sidebarDiv.style.right = '0';
    sidebarDiv.style.width = '350px';
    sidebarDiv.style.height = '100vh';
    sidebarDiv.style.background = '#1e1e2e';
    sidebarDiv.style.zIndex = '10000';
    sidebarDiv.style.boxShadow = '-2px 0 10px rgba(0, 0, 0, 0.3)';
    sidebarDiv.style.padding = '16px';
    sidebarDiv.style.color = 'white';
    sidebarDiv.style.fontFamily = 'Arial, sans-serif';
    sidebarDiv.style.overflow = 'auto';

    return sidebarDiv;
}

function createHeader(text: string) {
    const heading = document.createElement('h1');
    heading.textContent = text;
    heading.style.fontSize = '24px';
    heading.style.color = 'white';

    return heading;
}

function extractWithReadability(sidebar: HTMLElement) { 
    const title = document.title;
    const full_url = window.location.href;
    const hostname  = window.location.hostname;
    const path_name = window.location.pathname;

    // Readability modifies the document, so we need to clone it first
    const clone = document.cloneNode(true) as Document;

    const reader = new Readability(clone);
    const article = reader.parse();

    const contentContainer = document.createElement('div');
    contentContainer.innerHTML = article?.content || '';

    console.log('Extracted Article:', {
        title: article?.title,
        byline: article?.byline,
        content: article?.content,
    });

    return {title, full_url, hostname, path_name, contentContainer};

}


function initialize() {
    const sidebar = createSidebar();
    const sidebarHeader = createHeader('EduAI');
    sidebar.appendChild(sidebarHeader);

    extractWithReadability(sidebar);


    document.body.style.marginRight = '350px';
    document.body.appendChild(sidebar);
}

initialize();

