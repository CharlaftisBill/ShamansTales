import { PLAYER, FIGHTING_CLASS, RulesEngine } from '../engine.js';

export function openInspectModal(card) {
    const modal = document.getElementById('inspect-modal');
    document.getElementById('inspect-cost').innerText = card.cost;
    document.getElementById('inspect-class-icon-img').src = `../assets/hq/icons/ui/classes/${card.fightingClass.toLowerCase()}_emblem.png`;
    document.getElementById('inspect-class-amp').innerText = card.fcAmplifier;
    document.getElementById('inspect-title').innerText = card.name;
    document.getElementById('inspect-influence').innerText = RulesEngine.getEffectiveInfluence(card);
    document.getElementById('inspect-card-type').innerText = `${card.fightingClass} / ${card.title}`;

    
    const factionFolder = card.faction || (card.owner === PLAYER.P1 ? 'Greek' : 'Norse');
    const imagePath = `../assets/hq/icons/cards/${factionFolder.toLowerCase()}/${card.id}.png`;
    const inspectArtImg = document.getElementById('inspect-art-img');
    if (inspectArtImg) { 
        inspectArtImg.src = imagePath; 
        inspectArtImg.style.display = 'block'; 
        
        // Force reflow to re-trigger the CSS glitch reveal animation
        inspectArtImg.classList.remove('glitch-reveal');
        void inspectArtImg.offsetWidth;
        inspectArtImg.classList.add('glitch-reveal');
    }
    
    document.getElementById('inspect-card-type').innerText = `${card.fightingClass} / ${card.title}`;
    
    let desc = card.text ? `"${card.text}"` : "";
    
    let statsHTML = '';
    if (card.fightingClass === FIGHTING_CLASS.BERSERK) {
        statsHTML = `<div style="margin-top: 10px; color: #e74c3c; font-weight: bold;">⚔️ Berserk Charges Remaining: ${card.status.berserkCharges}</div>`;
    }
    document.getElementById('inspect-desc').innerHTML = `${desc}${statsHTML}`;
    document.getElementById('inspect-card').className = 'premium-card-25d ' + (card.owner === PLAYER.P1 ? 'friendly' : 'enemy');
    modal.classList.remove('modal-hidden');
    modal.classList.add('modal-visible');
}

export function closeInspectModal() {
    const modal = document.getElementById('inspect-modal');
    modal.classList.remove('modal-visible');
    modal.classList.add('modal-hidden');
};

