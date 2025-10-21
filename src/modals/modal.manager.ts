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

        this.removeEscapeKeyListener();
        this.resetFolderSelectorModalIfNeeded(modalToClose);
    }

    private removeEscapeKeyListener(): void {
        if (this.escapeKeyListener) {
            document.removeEventListener('keydown', this.escapeKeyListener, { capture: true });
        }
    }

    private resetFolderSelectorModalIfNeeded(modalElement: HTMLElement): void {
        if (modalElement.id !== 'folder-selector-modal') return;

        this.resetConfirmButton(modalElement);
        this.resetSelectedFolderName(modalElement);
        this.resetTreeContainerScroll(modalElement);
    }

    private resetConfirmButton(modalElement: HTMLElement): void {
        const confirmButton = modalElement.querySelector('#confirm-folder-button') as HTMLButtonElement | null;
        if (confirmButton) {
            confirmButton.disabled = true;
            confirmButton.dataset.selectedFolderId = '';
        }
    }

    private resetSelectedFolderName(modalElement: HTMLElement): void {
        const selectedFolderNameSpan = modalElement.querySelector('#selected-folder-name');
        if (selectedFolderNameSpan) {
            selectedFolderNameSpan.textContent = 'None';
        }
    }

    private resetTreeContainerScroll(modalElement: HTMLElement): void {
        const treeContainer = modalElement.querySelector('#folder-tree-container');
        if (treeContainer) {
            treeContainer.scrollTop = 0;
        }
    }

    getActiveModalElement(): HTMLElement | null {
        return this.activeModalElement;
    }
}
