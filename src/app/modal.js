export function createFormModal(elements) {
    let currentResolver = null;
    let currentValidate = null;

    function close(result = null) {
        elements.formModal.hidden = true;
        elements.formModal.classList.remove('visible');
        elements.formModalError.textContent = '';
        elements.formModalFields.innerHTML = '';
        currentValidate = null;

        if (currentResolver) {
            const resolver = currentResolver;
            currentResolver = null;
            resolver(result);
        }
    }

    function open({ title, submitLabel = 'Сохранить', fields, validate }) {
        if (currentResolver) {
            close(null);
        }

        currentValidate = validate || null;
        elements.formModalTitle.textContent = title;
        elements.formModalSubmit.textContent = submitLabel;
        elements.formModalError.textContent = '';

        elements.formModalFields.innerHTML = fields
            .map((field, index) => {
                const inputId = `modal-field-${field.name}-${index}`;
                const value = String(field.value ?? '').replace(/"/g, '&quot;');
                const minAttr = field.min !== undefined ? ` min="${field.min}"` : '';
                const maxAttr = field.max !== undefined ? ` max="${field.max}"` : '';
                const stepAttr = field.step !== undefined ? ` step="${field.step}"` : '';
                const placeholderAttr = field.placeholder ? ` placeholder="${field.placeholder}"` : '';

                return `
                    <div class="modal-field">
                        <label for="${inputId}">${field.label}</label>
                        <input
                            id="${inputId}"
                            name="${field.name}"
                            type="${field.type}"
                            value="${value}"
                            ${field.required ? 'required' : ''}
                            ${minAttr}
                            ${maxAttr}
                            ${stepAttr}
                            ${placeholderAttr}
                        >
                    </div>
                `;
            })
            .join('');

        elements.formModal.hidden = false;
        requestAnimationFrame(() => {
            elements.formModal.classList.add('visible');
            elements.formModalFields.querySelector('input, select, textarea')?.focus();
        });

        return new Promise((resolve) => {
            currentResolver = resolve;
        });
    }

    elements.formModalForm.addEventListener('submit', (event) => {
        event.preventDefault();

        const formData = new FormData(elements.formModalForm);
        const values = Object.fromEntries(formData.entries());

        if (currentValidate) {
            const validationError = currentValidate(values);
            if (validationError) {
                elements.formModalError.textContent = validationError;
                return;
            }
        }

        close(values);
    });

    elements.formModalCancel.addEventListener('click', () => {
        close(null);
    });

    elements.formModalCancelAlt.addEventListener('click', () => {
        close(null);
    });

    elements.formModal.addEventListener('click', (event) => {
        if (event.target === elements.formModal) {
            close(null);
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !elements.formModal.hidden) {
            close(null);
        }
    });

    return { open, close };
}
