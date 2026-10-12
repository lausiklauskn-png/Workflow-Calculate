/* Gestellte Antwort der Claude-API mit Websuche — Form nach der Doku (web_search_tool_result, Zitate
   web_search_result_location mit cited_text). Erfundene Anbieter und Adressen (.example). Vier Zeilen:
   belegt · Quelle nicht aus der Suche · Zahl nicht im Zitat · Gesamtpreis brutto (belegt). */
const Q1 = "https://druck-beispiel.example/tassen", Q2 = "https://grosshandel.example/tasse";
export const ZEILEN = [
  "PREIS | Druck Beispiel | online | 50 | 6,90 | stueck | netto | 4,95 | " + Q1,
  "PREIS | Erfunden GmbH | handwerk | 50 | 9,50 | stueck | netto | - | https://nicht-gesucht.example/x",
  "PREIS | Grosshandel Beispiel | import | 500 | 2,10 | stueck | netto | - | " + Q2,
  "PREIS | Druck Beispiel | online | 100 | 595,00 | gesamt | brutto | - | " + Q1,
];
export function teilA() {
  return { id: "msg_a", stop_reason: "pause_turn", usage: { input_tokens: 4000, output_tokens: 500, server_tool_use: { web_search_requests: 1 } },
    content: [
      { type: "text", text: "Ich suche nach Preisen." },
      { type: "server_tool_use", id: "srvtoolu_1", name: "web_search", input: { query: "Tasse bedrucken 50 Stück Preis" } },
      { type: "web_search_tool_result", tool_use_id: "srvtoolu_1", content: [
        { type: "web_search_result", url: Q1, title: "Tassen bedrucken", encrypted_content: "x1", page_age: "October 1, 2026" },
        { type: "web_search_result", url: Q2 + "/", title: "Tassen Großhandel", encrypted_content: "x2" }] },
    ] };
}
export function teilB() {
  return { id: "msg_b", stop_reason: "end_turn", usage: { input_tokens: 6000, output_tokens: 1500, server_tool_use: { web_search_requests: 1 } },
    content: [
      { type: "server_tool_use", id: "srvtoolu_2", name: "web_search", input: { query: "Tasse Großhandel 500" } },
      { type: "web_search_tool_result", tool_use_id: "srvtoolu_2", content: { type: "web_search_tool_result_error", error_code: "too_many_requests" } },
      { type: "text", text: "Laut Anbieter: " },
      { type: "text", text: "50 Tassen kosten 6,90 € je Stück", citations: [{ type: "web_search_result_location", url: Q1, title: "Tassen bedrucken", encrypted_index: "i1",
        cited_text: "Fototasse bedrucken ab 50 Stück: 6,90 € netto je Stück, Versand 4,95 €" }] },
      { type: "text", text: ", 100 Stück 595,00 €", citations: [{ type: "web_search_result_location", url: Q1, title: "Tassen bedrucken", encrypted_index: "i2",
        cited_text: "Paket 100 Stück: 595,00 € inkl. MwSt." }] },
      { type: "text", text: ", Großhandel ab 500 Stück", citations: [{ type: "web_search_result_location", url: Q2, title: "Tassen Großhandel", encrypted_index: "i3",
        cited_text: "Weiße Tasse ab 500 Stück 2,40 € zzgl. Druck" }] },
      { type: "text", text: ".\n\n" + ZEILEN.join("\n") },
    ] };
}
