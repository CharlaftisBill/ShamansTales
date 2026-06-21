import { TITLE, FIGHTING_CLASS_DESCRIPTIONS, RulesEngine, PLAYER, FIGHTING_CLASS } from '../engine.js';
import { SettingsManager } from '../settings-manager.js';

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

    const s = SettingsManager.getSettings();
    let gfxQuality = s.gfxQuality || 'hq';
    let allowHolograms = s.holograms !== false;

    const ext = SettingsManager.getGfxExtension();

    const factionFolder = card.faction || (card.owner === PLAYER.P1 ? 'Greek' : 'Norse');
    const imagePath = `../assets/${gfxQuality}/icons/cards/${factionFolder.toLowerCase()}/${card.id}.${ext}`;
    const fcEmblemPath = `../assets/${gfxQuality}/icons/ui/classes/${card.fightingClass.toLowerCase()}_emblem.${ext}`;
    const costEmblemPath = `../assets/${gfxQuality}/icons/ui/mechanics/cost_emblem.${ext}`;

    let hologramClass = '';
    if (allowHolograms && card.instanceId) {
        const animKey = `${card.instanceId}_${context}`;
        if (!animatedCardIds.has(animKey)) {
            hologramClass = 'glitch-reveal';
            animatedCardIds.add(animKey);
        }
    }

    const fcDesc = FIGHTING_CLASS_DESCRIPTIONS[card.fightingClass] || '';
    const fcTooltip = `Class: ${card.fightingClass}&#10;${fcDesc}`;

    let displayAmp = RulesEngine.getEffectiveAmplifier(card);
    if (card.fightingClass === FIGHTING_CLASS.BERSERK) {
        displayAmp = `<span style="color: #e74c3c;">${card.status?.berserkCharges ?? card.fcAmplifier}</span>`;
    } else if (card.status?.mysticBoost > 0) {
        displayAmp = `<span style="color: #2ecc71;">${displayAmp}</span>`;
    }

    let displayInf = RulesEngine.getEffectiveInfluence(card);
    if (card.status?.heraldBoost > 0) {
        displayInf = `<span style="color: #f1c40f;">${displayInf}</span>`;
    }

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
                <div class="full-art-amp-value">${displayAmp}</div>
            </div>
        </div>
        <div class="full-art-bottom-info-container">
            <div class="full-art-chess-symbol-small">${getChessSymbol(card.title)}</div>
            <div class="full-art-influence-container">
                <span class="full-art-influence-value-small">${displayInf}${mathHelperHtml}</span>
            </div>
        </div>
    `;
}
