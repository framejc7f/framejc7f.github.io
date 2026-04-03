import { escapeHtml } from './utils.js';

function serializeForm(form) {
    const values = {};
    const processedRadioNames = new Set();

    form.querySelectorAll('[name]').forEach((field) => {
        if (field.type === 'radio') {
            if (processedRadioNames.has(field.name)) {
                return;
            }

            processedRadioNames.add(field.name);
            const checked = form.querySelector(`[name="${field.name}"]:checked`);
            values[field.name] = checked ? checked.value : '';
            return;
        }

        if (field.type === 'checkbox') {
            values[field.name] = field.checked;
            return;
        }

        values[field.name] = field.value;
    });

    return values;
}

function renderField(field, index) {
    if (field.type === 'notice') {
        return `<div class="modal-note">${field.text}</div>`;
    }

    if (field.type === 'radio-group') {
        const options = field.options
            .map((option, optionIndex) => {
                const inputId = `modal-radio-${field.name}-${optionIndex}`;
                const isChecked = option.value === field.value ? 'checked' : '';

                return `
                    <label class="choice-card" for="${inputId}">
                        <input id="${inputId}" type="radio" name="${field.name}" value="${escapeHtml(option.value)}" ${isChecked}>
                        <span class="choice-card-body">
                            <span class="choice-card-title">${escapeHtml(option.label)}</span>
                            <span class="choice-card-description">${escapeHtml(option.description || '')}</span>
                        </span>
                    </label>
                `;
            })
            .join('');

        return `
            <div class="modal-field">
                <label>${escapeHtml(field.label)}</label>
                <div class="choice-grid">${options}</div>
            </div>
        `;
    }

    const inputId = `modal-field-${field.name}-${index}`;
    const required = field.required ? 'required' : '';
    const placeholder = field.placeholder ? ` placeholder="${escapeHtml(field.placeholder)}"` : '';
    const minAttr = field.min !== undefined ? ` min="${field.min}"` : '';
    const maxAttr = field.max !== undefined ? ` max="${field.max}"` : '';
    const stepAttr = field.step !== undefined ? ` step="${field.step}"` : '';

    if (field.type === 'textarea') {
        return `
            <div class="modal-field">
                <label for="${inputId}">${escapeHtml(field.label)}</label>
                <textarea id="${inputId}" name="${field.name}" ${required}${placeholder}>${escapeHtml(field.value || '')}</textarea>
                ${field.hint ? `<div class="modal-field-hint">${escapeHtml(field.hint)}</div>` : ''}
            </div>
        `;
    }

    if (field.type === 'select') {
        const options = field.options
            .map((option) => {
                const isSelected = option.value === field.value ? 'selected' : '';
                return `<option value="${escapeHtml(option.value)}" ${isSelected}>${escapeHtml(option.label)}</option>`;
            })
            .join('');

        return `
            <div class="modal-field">
                <label for="${inputId}">${escapeHtml(field.label)}</label>
                <select id="${inputId}" name="${field.name}" ${required}>${options}</select>
                ${field.hint ? `<div class="modal-field-hint">${escapeHtml(field.hint)}</div>` : ''}
            </div>
        `;
    }

    if (field.type === 'checkbox') {
        const checked = field.value ? 'checked' : '';

        return `
            <label class="modal-switch" for="${inputId}">
                <div>
                    <span class="theme-toggle-title">${escapeHtml(field.label)}</span>
                    ${field.hint ? `<span class="theme-toggle-caption">${escapeHtml(field.hint)}</span>` : ''}
                </div>
                <span class="switch-control">
                    <input id="${inputId}" type="checkbox" name="${field.name}" ${checked}>
                    <span class="switch-slider"></span>
                </span>
            </label>
        `;
    }

    return `
        <div class="modal-field">
            <label for="${inputId}">${escapeHtml(field.label)}</label>
            <input
                id="${inputId}"
                name="${field.name}"
                type="${field.type}"
                value="${escapeHtml(field.value || '')}"
                ${required}
                ${placeholder}
                ${minAttr}
                ${maxAttr}
                ${stepAttr}
            >
            ${field.hint ? `<div class="modal-field-hint">${escapeHtml(field.hint)}</div>` : ''}
        </div>
    `;
}

export function createFormModal(elements) {
    let currentResolver = null;
    let currentValidate = null;
    let currentGetValues = null;
    let currentCleanup = null;

    function close(result = null) {
        elements.formModal.hidden = true;
        elements.formModal.classList.remove('visible');
        elements.formModalError.textContent = '';
        elements.formModalFields.innerHTML = '';
        currentValidate = null;
        currentGetValues = null;

        if (currentCleanup) {
            currentCleanup();
            currentCleanup = null;
        }

        if (currentResolver) {
            const resolver = currentResolver;
            currentResolver = null;
            resolver(result);
        }
    }

    function openCustom({
        title,
        submitLabel = 'Сохранить',
        render,
        validate,
        getValues,
        onMount
    }) {
        if (currentResolver) {
            close(null);
        }

        currentValidate = validate || null;
        currentGetValues = getValues || ((form) => serializeForm(form));

        elements.formModalTitle.textContent = title;
        elements.formModalSubmit.textContent = submitLabel;
        elements.formModalError.textContent = '';
        elements.formModalFields.innerHTML = render();

        elements.formModal.hidden = false;

        requestAnimationFrame(() => {
            elements.formModal.classList.add('visible');
            elements.formModalFields.querySelector('input, select, textarea')?.focus();
        });

        currentCleanup = onMount
            ? onMount({
                form: elements.formModalForm,
                fieldsContainer: elements.formModalFields,
                errorElement: elements.formModalError,
                close
            })
            : null;

        return new Promise((resolve) => {
            currentResolver = resolve;
        });
    }

    function openForm({ title, submitLabel = 'Сохранить', fields, validate }) {
        return openCustom({
            title,
            submitLabel,
            validate,
            render() {
                return fields.map((field, index) => renderField(field, index)).join('');
            }
        });
    }

    elements.formModalForm.addEventListener('submit', (event) => {
        event.preventDefault();

        const values = currentGetValues ? currentGetValues(elements.formModalForm) : serializeForm(elements.formModalForm);

        if (currentValidate) {
            const validationError = currentValidate(values, elements.formModalForm);
            if (validationError) {
                elements.formModalError.textContent = validationError;
                return;
            }
        }

        close(values);
    });

    elements.formModalCancel.addEventListener('click', () => close(null));
    elements.formModalCancelAlt.addEventListener('click', () => close(null));

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

    return {
        openForm,
        openCustom,
        close
    };
}
