import { FIGHTING_CLASS } from '../engine.js';

export const VFXManager = {
    triggerSummon(x, y) {
        window.dispatchEvent(new CustomEvent('PLAY_SFX', { detail: 'summon' }));
        const cell = document.getElementById(`cell-${x}-${y}`);
        if (cell && cell.firstElementChild) {
            cell.firstElementChild.classList.add('vfx-summon-active');
            setTimeout(() => {
                if (cell.firstElementChild) {
                    cell.firstElementChild.classList.remove('vfx-summon-active');
                }
            }, 400);
        }
    },

    triggerAttack(attackerCard, targetCoords, attackerX, attackerY) {
        const fc = attackerCard.fightingClass;
        const isAbility = fc === FIGHTING_CLASS.MYSTIC || fc === FIGHTING_CLASS.HERALD;

        if (!isAbility) {
            document.body.classList.add('screen-shake');
            setTimeout(() => document.body.classList.remove('screen-shake'), 300);
        }

        let sfxName = isAbility ? 'summon' : 'attackBrawler';
        let vfxClass = isAbility ? 'vfx-summon-active' : 'vfx-explosion';

        if (fc === FIGHTING_CLASS.LANCER) {
            sfxName = 'attackPiercer';
            vfxClass = 'vfx-laser-beam';
        } else if (fc === FIGHTING_CLASS.HUNTER) {
            sfxName = 'attackRanger';
            vfxClass = 'vfx-sniper-crosshair';
        }

        window.dispatchEvent(new CustomEvent('PLAY_SFX', { detail: sfxName }));

        if (!isAbility && attackerX !== undefined && attackerY !== undefined) {
            const boardContainer = document.getElementById('board');
            if (boardContainer) {
                targetCoords.forEach(t => {
                    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                    svg.setAttribute('class', 'vfx-hunter-arc-svg');
                    svg.setAttribute('viewBox', '0 0 100 100');
                    svg.setAttribute('preserveAspectRatio', 'none');
                    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                    
                    const startPxX = (attackerX * 20) + 10;
                    const startPxY = (attackerY * 20) + 10;
                    const endPxX = (t.x * 20) + 10;
                    const endPxY = (t.y * 20) + 10;
                    
                    const midX = (startPxX + endPxX) / 2;
                    const midY = (startPxY + endPxY) / 2 - 30;
                    
                    path.setAttribute('d', `M ${startPxX} ${startPxY} Q ${midX} ${midY} ${endPxX} ${endPxY}`);
                    path.setAttribute('class', 'hunter-arc-path');
                    
                    svg.appendChild(path);
                    boardContainer.appendChild(svg);
                    
                    setTimeout(() => {
                        if (boardContainer.contains(svg)) boardContainer.removeChild(svg);
                    }, 500);
                });
            }
        }

        targetCoords.forEach(t => {
            const targetCell = document.getElementById(`cell-${t.x}-${t.y}`);
            if (targetCell) {
                if (isAbility) {
                    if (targetCell.firstElementChild) {
                        targetCell.firstElementChild.classList.add('vfx-summon-active');
                        setTimeout(() => {
                            if (targetCell.firstElementChild) {
                                targetCell.firstElementChild.classList.remove('vfx-summon-active');
                            }
                        }, 400);
                    }
                } else {
                    if (targetCell.firstElementChild) {
                        targetCell.firstElementChild.classList.add('vfx-shake-active');
                        setTimeout(() => {
                            if (targetCell.firstElementChild) {
                                targetCell.firstElementChild.classList.remove('vfx-shake-active');
                            }
                        }, 300);
                    }

                    const particleContainer = document.createElement('div');
                    particleContainer.className = 'vfx-particle-container';
                    const particle = document.createElement('div');
                    particle.className = vfxClass;
                    particleContainer.appendChild(particle);
                    targetCell.appendChild(particleContainer);

                    setTimeout(() => {
                        if (targetCell.contains(particleContainer)) {
                            targetCell.removeChild(particleContainer);
                        }
                    }, 400);
                }
            }
        });
    },

    triggerExhaust(x, y) {
        window.dispatchEvent(new CustomEvent('PLAY_SFX', { detail: 'exhaust' }));
        const cell = document.getElementById(`cell-${x}-${y}`);
        if (cell && cell.firstElementChild) {
            cell.firstElementChild.classList.add('vfx-exhaust-active');
            setTimeout(() => {
                if (cell.firstElementChild) {
                    cell.firstElementChild.classList.remove('vfx-exhaust-active');
                }
            }, 400);
        }
    },

    triggerBlocked(x, y) {
        window.dispatchEvent(new CustomEvent('PLAY_SFX', { detail: 'select' }));
        const targetCell = document.getElementById(`cell-${x}-${y}`);
        if (targetCell) {
            const popup = document.createElement('div');
            popup.className = 'vfx-blocked-text';
            popup.innerText = 'Blocked!';
            targetCell.appendChild(popup);
            setTimeout(() => {
                if (targetCell.contains(popup)) targetCell.removeChild(popup);
            }, 800);
        }
    }
};
