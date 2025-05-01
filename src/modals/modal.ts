export class ModalManager {
    private activeModalElement: HTMLElement | null = null;
    private escapeKeyListener: ((event: KeyboardEvent) => void) | null = null;

    constructor() {
        this.escapeKeyListener = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && this.activeModalElement) {
                this.closeActiveModal();
            }
        };
    }

    openModal(modalElement: HTMLElement | null): void {
        if (!modalElement || this.activeModalElement === modalElement) return;
        if (this.activeModalElement) this.closeActiveModal();
        modalElement.classList.remove('hidden');
        this.activeModalElement = modalElement;
        setTimeout(() => {
            if (this.escapeKeyListener) document.addEventListener('keydown', this.escapeKeyListener, { capture: true });
        }, 0);
    }

    closeActiveModal(): void {
        if (!this.activeModalElement) return;
        const modalToClose = this.activeModalElement;
        this.activeModalElement = null;
        modalToClose.classList.add('hidden');
        if (this.escapeKeyListener) document.removeEventListener('keydown', this.escapeKeyListener, { capture: true });
        if (modalToClose.id === 'folder-selector-modal') {
            const confirmButton = modalToClose.querySelector('#confirm-folder-button') as HTMLButtonElement | null;
            const selectedFolderNameSpan = modalToClose.querySelector('#selected-folder-name');
            if (confirmButton) { confirmButton.disabled = true; confirmButton.dataset.selectedFolderId = ''; }
            if (selectedFolderNameSpan) selectedFolderNameSpan.textContent = 'None';
            const treeContainer = modalToClose.querySelector('#folder-tree-container');
            if (treeContainer) treeContainer.scrollTop = 0;
        }
    }

    getActiveModalElement(): HTMLElement | null {
        return this.activeModalElement;
    }
}
