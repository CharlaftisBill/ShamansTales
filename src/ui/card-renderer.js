import { TITLE, FIGHTING_CLASS_DESCRIPTIONS, RulesEngine, PLAYER } from '../engine.js';

export const animatedCardIds = new Set();

export function getChessSymbol(title) {
    switch (title) {
        case TITLE.PAWN: return '♙';
        case TITLE.KNIGHT: return '♘';
        case TITLE.BISHOP: return '♗';
        case TITLE.ROOK: return '♖';
        case TITLE.QUEEN: return '♕';
        case TITLE.KING: return '♔';
        default: return '';
    }
}

export function generateCardHTML(card, overlayHtml = '', mathBonus = null, context = 'board') {
    let statusHtml = '';
    if (card.status.sealedTurns > 0) statusHtml += `<div class="status-sealed-overlay">🔗<br>${card.status.sealedTurns}</div>`;

    let mathHelperHtml = '';
    if (mathBonus) mathHelperHtml = `<span class="math-helper">${mathBonus > 0 ? '+' : ''}${mathBonus}</span>`;

    const factionFolder = card.faction || (card.owner === PLAYER.P1 ? 'Greek' : 'Norse');
    const imagePath = `../assets/hq/icons/cards/${factionFolder.toLowerCase()}/${card.id}.png`;
    const fcEmblemPath = `../assets/hq/icons/ui/classes/${card.fightingClass.toLowerCase()}_emblem.png`;
    const costEmblemPath = `../assets/hq/icons/ui/mechanics/cost_emblem.png`;

    let hologramClass = '';
    if (card.instanceId) {
        const animKey = `${card.instanceId}_${context}`;
        if (!animatedCardIds.has(animKey)) {
            hologramClass = 'glitch-reveal';
            animatedCardIds.add(animKey);
        }
    }

    const fcDesc = FIGHTING_CLASS_DESCRIPTIONS[card.fightingClass] || '';
    const fcTooltip = `Class: ${card.fightingClass}&#10;${fcDesc}`;

    return `${overlayHtml}${statusHtml}
        <img class="full-art-image ${hologramClass}" src="${imagePath}" alt="${card.name}">
        <div class="full-art-gradient-top"></div>
        <div class="full-art-gradient-bottom"></div>
        <div class="full-art-cost-container">
            <img class="full-art-cost-icon" src="${costEmblemPath}" alt="Cost">
            <span class="full-art-cost-value">${card.cost}</span>
        </div>
        <div class="full-art-class-container" title="${fcTooltip}">
            <div style="position: relative;">
                <img class="full-art-class-icon" src="${fcEmblemPath}" alt="${card.fightingClass}">
                <div class="full-art-amp-value">${card.fcAmplifier}</div>
            </div>
        </div>
        <div class="full-art-bottom-info-container">
            <div class="full-art-chess-symbol-small">${getChessSymbol(card.title)}</div>
            <div class="full-art-influence-container">
                <span class="full-art-influence-value-small">${RulesEngine.getEffectiveInfluence(card)}${mathHelperHtml}</span>
            </div>
        </div>
    `;
}
