import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GridComponent } from './grid.component';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GRID_ENGINE, GridEnginePort } from '../../ports/grid-engine.port';

describe('GridComponent', () => {
  let component: GridComponent;
  let fixture: ComponentFixture<GridComponent>;
  
  // Mock simple du moteur de grille
  const mockGridEngine: GridEnginePort = {
    init: vi.fn(),
    destroy: vi.fn()
  };

  beforeEach(async () => {
    // Réinitialiser les mocks avant chaque test
    mockGridEngine.init = vi.fn();
    mockGridEngine.destroy = vi.fn();

    await TestBed.configureTestingModule({
      imports: [GridComponent]
    })
    .overrideComponent(GridComponent, {
      set: {
        providers: [
          { provide: GRID_ENGINE, useValue: mockGridEngine }
        ]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(GridComponent);
    component = fixture.componentInstance;
    
    // Initialiser les inputs requis
    fixture.componentRef.setInput('tiles', []);
    
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call init on the grid engine', async () => {
    // Attendre que afterNextRender s'exécute
    await fixture.whenStable();
    expect(mockGridEngine.init).toHaveBeenCalled();
  });

  it('should have a grid container', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.mosaic-grid-wrapper')).toBeTruthy();
  });
});
