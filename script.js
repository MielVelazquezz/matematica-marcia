document.addEventListener('DOMContentLoaded', function () {
    const termsContainer = document.getElementById('terms');
    const addTermBtn = document.getElementById('add-term-btn');
    const modal = document.getElementById('add-term-modal');
    const closeModal = document.getElementById('close-modal');
    const addTermForm = document.getElementById('add-term-form');
    const searchInput = document.getElementById('search');
    const letterButtons = document.querySelectorAll('.letter-btn'); // Botões de filtro por letra
    let isEditing = false;
    let editingId = null;

    let activeLetter = ""; // Variável para armazenar a letra atualmente ativa

    async function fetchTerms(keyword = "", letter = "") {
        try {
            const response = await fetch(`http://localhost:8000/search/?keyword=${keyword}`);
            const terms = await response.json();
    
            // Filtra os termos considerando a letra inicial e desconsiderando acentos e maiúsculas/minúsculas
            const filteredTerms = terms.filter(term => 
                term.term.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().startsWith(letter.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase())
            );
    
            // Verifica se existem termos filtrados
            if (letter === activeLetter) {
                // Se a letra clicada for a mesma da anterior, exibe todos os termos
                displayTerms(terms);
                activeLetter = ""; // Reseta a letra ativa
            } else {
                // Caso contrário, exibe os termos filtrados pela letra
                if (filteredTerms.length === 0) {
                    termsContainer.innerHTML = "<p>Nenhum termo com essa inicial</p>";
                } else {
                    displayTerms(filteredTerms);
                }
                activeLetter = letter; // Define a nova letra ativa
            }
        } catch (error) {
            console.error("Erro ao buscar termos:", error);
        }
    }
    

    function displayTerms(terms) {
        termsContainer.innerHTML = "";
        terms.forEach(term => {
            const card = document.createElement("div");
            card.classList.add("card");

            const exampleText = term.example || "Não disponível";
            const sourceText = term.source || "Não disponível";

            card.innerHTML = `
                <div class="card-inner">
                    <div class="card-front">
                        <h3>${term.term}</h3>
                        <p>${term.definition}</p>
                        <small>Tema: ${term.theme}</small>
                        <div class="card-buttons">
                            <button class="edit-btn" data-id="${term.id}">
                                ✏️
                            </button>
                            <button class="delete-btn" data-id="${term.id}">
                                🗑️
                            </button>
                        </div>
                    </div>
                    <div class="card-back">
                        <p><strong>Exemplo:</strong><br>${exampleText.replace(/\n/g, '<br>')}</p>
                        <p class="pFonte"><strong>Fonte:</strong> <a href="${term.source}" target="_blank" class="source-link">${sourceText}</p>
                    </div>
                </div>
            `;

            card.querySelector('.delete-btn').addEventListener('click', async (event) => {
                const termId = event.target.dataset.id;
                if (!termId) {
                    console.error("ID do termo não encontrado.");
                    return;
                }
                await deleteTerm(termId);
            });
            

            card.querySelector('.edit-btn').addEventListener('click', (event) => {
                const termId = event.target.closest('.edit-btn').dataset.id;
                loadTermForEditing(termId);
            });

            termsContainer.appendChild(card);
        });
    }

    async function deleteTerm(termId) {
        try {
            await fetch(`http://localhost:8000/delete_term/${termId}`, { method: 'DELETE' });
            fetchTerms();
        } catch (error) {
            console.error("Erro ao deletar termo:", error);
        }
    }

    async function loadTermForEditing(termId) {
        try {
            const response = await fetch(`http://localhost:8000/terms/${termId}`);
            const term = await response.json();

            // Preencher o formulário com os dados do termo
            document.getElementById('term').value = term.term;
            document.getElementById('definition').value = term.definition;
            document.getElementById('theme').value = term.theme;
            document.getElementById('example').value = term.example;
            document.getElementById('source').value = term.source;

            isEditing = true;
            editingId = termId;
            modal.classList.add('active');
        } catch (error) {
            console.error("Erro ao carregar termo para edição:", error);
        }
    }

    addTermForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const termData = {
            term: document.getElementById('term').value,
            definition: document.getElementById('definition').value,
            theme: document.getElementById('theme').value,
            example: document.getElementById('example').value,
            source: document.getElementById('source').value
        };

        try {
            if (isEditing) {
                await fetch(`http://localhost:8000/update_term/${editingId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(termData)
                });
            } else {
                await fetch('http://localhost:8000/add_term/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(termData)
                });
            }

            fetchTerms();
            modal.classList.remove('active');
            isEditing = false;
            editingId = null;
        } catch (error) {
            console.error("Erro ao salvar termo:", error);
        }
        resetFormFields();

    });

    addTermBtn.addEventListener('click', () => {
        modal.classList.add('active');
        isEditing = false;
        editingId = null;
    });

    closeModal.addEventListener('click', () => {
        modal.classList.remove('active');
        resetFormFields();
    });

    function resetFormFields() {
        addTermForm.reset(); // Reseta todos os campos do formulário
        isEditing = false; // Reseta o estado de edição
        editingId = null;  // Remove o ID do termo em edição
    }
    
    

    letterButtons.forEach(button => {
        button.addEventListener("click", () => {
            const letter = button.dataset.letter;
            fetchTerms("", letter);
        });
    });

    searchInput.addEventListener('input', () => {
        const keyword = searchInput.value;
        fetchTerms(keyword);
    });

    fetchTerms();
});
