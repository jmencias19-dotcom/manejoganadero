const botToken = process.env.BOT_TOKEN;

console.log("----------------------------------------");
console.log("  INICIANDO DIAGNÓSTICO EN GITHUB ACTIONS");
console.log("----------------------------------------");

if (!botToken) {
  console.log("⚠️ ATENCIÓN: La variable BOT_TOKEN (secreto JJM1) NO fue encontrada.");
  console.log("👉 Revisa en GitHub: Settings > Secrets and variables > Actions > Repository secrets.");
} else {
  console.log("✅ ÉXITO: El secreto JJM1 fue leído correctamente.");
}

console.log("🚀 El script ejecutó su estructura base sin colapsar.");
