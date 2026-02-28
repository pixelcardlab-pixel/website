const products = [
  { name: "Charizard ex - Obsidian Flames", category: "Ultra Rare", price: 39.9, icon: "🔥", tone: "linear-gradient(145deg,#ff8a65,#ffcc80)" },
  { name: "Pikachu Illustration Rare", category: "Illustration", price: 24.0, icon: "⚡", tone: "linear-gradient(145deg,#ffe082,#ffd54f)" },
  { name: "Mewtwo VSTAR", category: "VSTAR", price: 32.5, icon: "🧠", tone: "linear-gradient(145deg,#ce93d8,#b39ddb)" },
  { name: "151 Booster Bundle", category: "Sealed", price: 59.0, icon: "📦", tone: "linear-gradient(145deg,#90caf9,#80deea)" },
  { name: "Gengar Alt Art", category: "Alt Art", price: 149.0, icon: "👻", tone: "linear-gradient(145deg,#b39ddb,#7e57c2)" },
  { name: "Umbreon VMAX", category: "Secret Rare", price: 341.0, icon: "🌙", tone: "linear-gradient(145deg,#9fa8da,#5c6bc0)" },
  { name: "Eevee Evolutions Lot", category: "Bundle", price: 89.0, icon: "🦊", tone: "linear-gradient(145deg,#ffcc80,#ffab91)" },
  { name: "PSA 10 Blastoise", category: "Graded", price: 229.0, icon: "💧", tone: "linear-gradient(145deg,#81d4fa,#4fc3f7)" },
  { name: "Vintage Jungle Pack", category: "Vintage", price: 199.0, icon: "🌿", tone: "linear-gradient(145deg,#a5d6a7,#81c784)" }
];

const recommendations = [
  { name: "Trainer Box Placeholder", category: "Sealed", price: 79.0, icon: "🎁", tone: "linear-gradient(145deg,#ffab91,#ffcc80)" },
  { name: "Mew Collection Placeholder", category: "Single", price: 44.0, icon: "✨", tone: "linear-gradient(145deg,#f8bbd0,#e1bee7)" },
  { name: "Dragonite Card Lot", category: "Bundle", price: 52.0, icon: "🐉", tone: "linear-gradient(145deg,#90caf9,#ffe082)" },
  { name: "Booster Tin Placeholder", category: "Tin", price: 34.0, icon: "🥫", tone: "linear-gradient(145deg,#b0bec5,#90a4ae)" }
];

const cardMarkup = (item) => `
  <article class="product-card">
    <div class="thumb" style="background:${item.tone}">
      <span>${item.icon}</span>
      <small class="tag">${item.category}</small>
    </div>
    <h3 class="product-title">${item.name}</h3>
    <p class="meta">Placeholder listing • Limited stock</p>
    <div class="price-row">
      <strong class="price">$${item.price.toFixed(2)}</strong>
      <span class="meta">4.8 ★</span>
    </div>
    <div class="actions">
      <button>Add to Cart</button>
      <button class="buy">Buy Now</button>
    </div>
  </article>
`;

document.getElementById("productGrid").innerHTML = products.map(cardMarkup).join("");
document.getElementById("recommendStrip").innerHTML = recommendations.map(cardMarkup).join("");
