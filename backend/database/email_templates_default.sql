-- Default Email Templates for NetworkFollowUp
-- Insert these templates for new users

-- English Templates
INSERT INTO email_templates (user_id, customer_type, language, subject, body, is_default) VALUES
(NULL, 'retail', 'en', 
'Save 25% on All Your doTERRA Products!',
'Hi {{firstname}},

I noticed you recently purchased from doTERRA. Did you know you can save 25% on every order with a Wholesale Membership?

For just $35 (which pays for itself with your first order), you get:
✓ 25% automatic discount on all products
✓ No monthly purchase requirements
✓ Access to exclusive promotions
✓ Product of the Month opportunities

It takes 2 minutes to set up and you start saving immediately.

Ready to save? Click here: [SIGNUP LINK]

Questions? Just reply to this email!

Best regards,
{{your-name}}
{{your-phone}}', 
true),

(NULL, 'wholesale', 'en',
'Unlock FREE Products with LRP',
'Hi {{firstname}},

As a Wholesale Member, you''re already saving 25%. But did you know you could be earning FREE products every month?

The Loyalty Rewards Program (LRP) gives you:
✓ Up to 30% back in product credits
✓ FREE Product of the Month
✓ FREE shipping on qualifying orders
✓ Points that never expire

Your next order could earn you $30-50 in free products. Want to learn how?

Click here: [LRP INFO LINK]

Let me know if you have questions!

Best,
{{your-name}}
{{your-phone}}',
true),

(NULL, 'advocates', 'en',
'Let''s Grow Your doTERRA Business Together',
'Hi {{firstname}},

I''d love to schedule a quick 15-minute call to discuss your business goals for 2025.

We can cover:
✓ Personalized marketing strategy
✓ Team duplication techniques  
✓ Rank advancement roadmap
✓ Social media content plan

No pressure - just a friendly conversation about where you want to take your business.

Available times: [CALENDAR LINK]

Looking forward to connecting!

{{your-name}}
{{your-phone}}',
true);

-- Italian Templates  
INSERT INTO email_templates (user_id, customer_type, language, subject, body, is_default) VALUES
(NULL, 'retail', 'it',
'Risparmia il 25% su tutti i prodotti doTERRA!',
'Ciao {{firstname}},

Ho notato che recentemente hai acquistato da doTERRA. Sapevi che puoi risparmiare il 25% su ogni ordine con l''iscrizione Wholesale?

Con soli €35 (che si ripaga con il primo ordine), ottieni:
✓ Sconto automatico del 25% su tutti i prodotti
✓ Nessun obbligo di acquisto mensile
✓ Accesso a promozioni esclusive
✓ Opportunità Prodotto del Mese

Bastano 2 minuti per registrarti e inizi subito a risparmiare.

Pronto/a a risparmiare? Clicca qui: [LINK REGISTRAZIONE]

Domande? Rispondi a questa email!

Cordiali saluti,
{{your-name}}
{{your-phone}}',
true),

(NULL, 'wholesale', 'it',
'Sblocca prodotti GRATUITI con LRP',
'Ciao {{firstname}},

Come membro Wholesale, stai già risparmiando il 25%. Ma sapevi che potresti guadagnare prodotti GRATUITI ogni mese?

Il Loyalty Rewards Program (LRP) ti offre:
✓ Fino al 30% in crediti prodotto
✓ Prodotto del Mese GRATUITO
✓ Spedizione GRATUITA sugli ordini qualificati
✓ Punti che non scadono mai

Il tuo prossimo ordine potrebbe farti guadagnare €30-50 in prodotti gratuiti. Vuoi sapere come?

Clicca qui: [LINK INFO LRP]

Fammi sapere se hai domande!

Saluti,
{{your-name}}
{{your-phone}}',
true),

(NULL, 'advocates', 'it',
'Facciamo crescere insieme la tua attività doTERRA',
'Ciao {{firstname}},

Mi piacerebbe fissare una breve chiamata di 15 minuti per discutere i tuoi obiettivi di business per il 2025.

Possiamo parlare di:
✓ Strategia di marketing personalizzata
✓ Tecniche di duplicazione del team
✓ Piano di avanzamento di grado
✓ Piano contenuti social media

Nessuna pressione - solo una chiacchierata amichevole su dove vuoi portare la tua attività.

Orari disponibili: [LINK CALENDARIO]

Non vedo l''ora di parlare con te!

{{your-name}}
{{your-phone}}',
true);

-- Spanish Templates
INSERT INTO email_templates (user_id, customer_type, language, subject, body, is_default) VALUES
(NULL, 'retail', 'es',
'¡Ahorra 25% en todos los productos doTERRA!',
'Hola {{firstname}},

Noté que recientemente compraste de doTERRA. ¿Sabías que puedes ahorrar 25% en cada pedido con una Membresía Mayorista?

Por solo $35 (que se paga con tu primer pedido), obtienes:
✓ Descuento automático del 25% en todos los productos
✓ Sin requisitos de compra mensual
✓ Acceso a promociones exclusivas
✓ Oportunidades de Producto del Mes

Toma 2 minutos configurar y empiezas a ahorrar inmediatamente.

¿Listo para ahorrar? Haz clic aquí: [ENLACE REGISTRO]

¿Preguntas? ¡Responde a este correo!

Saludos,
{{your-name}}
{{your-phone}}',
true),

(NULL, 'wholesale', 'es',
'Desbloquea productos GRATIS con LRP',
'Hola {{firstname}},

Como Miembro Mayorista, ya estás ahorrando 25%. ¿Pero sabías que podrías estar ganando productos GRATIS cada mes?

El Programa de Recompensas por Lealtad (LRP) te da:
✓ Hasta 30% de vuelta en créditos de producto
✓ Producto del Mes GRATIS
✓ Envío GRATIS en pedidos calificados
✓ Puntos que nunca expiran

Tu próximo pedido podría ganarte $30-50 en productos gratis. ¿Quieres saber cómo?

Haz clic aquí: [ENLACE INFO LRP]

¡Avísame si tienes preguntas!

Saludos,
{{your-name}}
{{your-phone}}',
true),

(NULL, 'advocates', 'es',
'Hagamos crecer tu negocio doTERRA juntos',
'Hola {{firstname}},

Me encantaría programar una llamada rápida de 15 minutos para discutir tus metas de negocio para 2025.

Podemos cubrir:
✓ Estrategia de marketing personalizada
✓ Técnicas de duplicación de equipo
✓ Plan de avance de rango
✓ Plan de contenido para redes sociales

Sin presión - solo una conversación amigable sobre dónde quieres llevar tu negocio.

Horarios disponibles: [ENLACE CALENDARIO]

¡Espero conectar pronto!

{{your-name}}
{{your-phone}}',
true);

-- Add German, French, Polish, Bulgarian, Czech, Romanian, Slovak templates...
-- (Following same pattern)

-- German Templates
INSERT INTO email_templates (user_id, customer_type, language, subject, body, is_default) VALUES
(NULL, 'retail', 'de',
'Spare 25% bei allen doTERRA Produkten!',
'Hallo {{firstname}},

ich habe bemerkt, dass du kürzlich bei doTERRA eingekauft hast. Wusstest du, dass du bei jeder Bestellung 25% sparen kannst mit einer Großhandels-Mitgliedschaft?

Für nur 35€ (die sich mit deiner ersten Bestellung bezahlt machen) erhältst du:
✓ Automatisch 25% Rabatt auf alle Produkte
✓ Keine monatlichen Kaufverpflichtungen
✓ Zugang zu exklusiven Aktionen
✓ Produkt des Monats Möglichkeiten

Es dauert 2 Minuten und du sparst sofort.

Bereit zu sparen? Klicke hier: [ANMELDE-LINK]

Fragen? Antworte einfach auf diese E-Mail!

Viele Grüße,
{{your-name}}
{{your-phone}}',
true);

-- French Templates
INSERT INTO email_templates (user_id, customer_type, language, subject, body, is_default) VALUES
(NULL, 'retail', 'fr',
'Économisez 25% sur tous les produits doTERRA!',
'Bonjour {{firstname}},

J''ai remarqué que vous avez récemment acheté chez doTERRA. Saviez-vous que vous pouvez économiser 25% sur chaque commande avec un Abonnement Grossiste?

Pour seulement 35€ (qui se rentabilise dès votre première commande), vous obtenez:
✓ Réduction automatique de 25% sur tous les produits
✓ Aucune obligation d''achat mensuel
✓ Accès aux promotions exclusives
✓ Opportunités Produit du Mois

Cela prend 2 minutes et vous économisez immédiatement.

Prêt à économiser? Cliquez ici: [LIEN INSCRIPTION]

Des questions? Répondez simplement à cet e-mail!

Cordialement,
{{your-name}}
{{your-phone}}',
true);

-- Polish Templates
INSERT INTO email_templates (user_id, customer_type, language, subject, body, is_default) VALUES
(NULL, 'retail', 'pl',
'Oszczędź 25% na wszystkich produktach doTERRA!',
'Cześć {{firstname}},

Zauważyłem/am, że niedawno kupiłeś/aś w doTERRA. Czy wiesz, że możesz oszczędzić 25% na każdym zamówieniu dzięki Członkostwu Hurtowemu?

Za jedyne 35 PLN (które zwracają się już przy pierwszym zamówieniu) otrzymujesz:
✓ Automatyczny rabat 25% na wszystkie produkty
✓ Brak obowiązku miesięcznych zakupów
✓ Dostęp do ekskluzywnych promocji
✓ Możliwość Produktu Miesiąca

Zajmuje to 2 minuty i od razu zaczynasz oszczędzać.

Gotowy/a oszczędzać? Kliknij tutaj: [LINK REJESTRACJI]

Pytania? Po prostu odpowiedz na ten e-mail!

Pozdrawiam,
{{your-name}}
{{your-phone}}',
true);

-- Bulgarian Templates
INSERT INTO email_templates (user_id, customer_type, language, subject, body, is_default) VALUES
(NULL, 'retail', 'bg',
'Спестете 25% от всички doTERRA продукти!',
'Здравей {{firstname}},

Забелязах, че наскоро си купил/а от doTERRA. Знаеше ли, че можеш да спестиш 25% от всяка поръчка с Едро Членство?

За само 35 лв (които се изплащат от първата ти поръчка) получаваш:
✓ Автоматична отстъпка 25% за всички продукти
✓ Без месечни задължения за покупка
✓ Достъп до ексклузивни промоции
✓ Възможности за Продукт на Месеца

Отнема 2 минути и веднага започваш да спестяваш.

Готов/а да спестяваш? Кликни тук: [ЛИНК ЗА РЕГИСТРАЦИЯ]

Въпроси? Просто отговори на този имейл!

Поздрави,
{{your-name}}
{{your-phone}}',
true);

-- Czech Templates
INSERT INTO email_templates (user_id, customer_type, language, subject, body, is_default) VALUES
(NULL, 'retail', 'cs',
'Ušetřete 25% na všech produktech doTERRA!',
'Ahoj {{firstname}},

Všiml/a jsem si, že jsi nedávno nakoupil/a od doTERRA. Věděl/a jsi, že můžeš ušetřit 25% na každé objednávce s Velkoobchodním členstvím?

Za pouhých 35 Kč (které se vrátí už při první objednávce) získáváš:
✓ Automatickou slevu 25% na všechny produkty
✓ Žádné měsíční povinnosti k nákupu
✓ Přístup k exkluzivním akcím
✓ Příležitosti k Produktu měsíce

Zabere to 2 minuty a hned začneš šetřit.

Připraven/a šetřit? Klikni zde: [ODKAZ NA REGISTRACI]

Otázky? Jen odpověz na tento e-mail!

S pozdravem,
{{your-name}}
{{your-phone}}',
true);

-- Romanian Templates
INSERT INTO email_templates (user_id, customer_type, language, subject, body, is_default) VALUES
(NULL, 'retail', 'ro',
'Economisește 25% la toate produsele doTERRA!',
'Salut {{firstname}},

Am observat că recent ai cumpărat de la doTERRA. Știai că poți economisi 25% la fiecare comandă cu un Abonament Angro?

Pentru doar 35 RON (care se recuperează cu prima comandă) primești:
✓ Reducere automată de 25% la toate produsele
✓ Fără obligații lunare de cumpărare
✓ Acces la promoții exclusive
✓ Oportunități Produsul Lunii

Durează 2 minute și începi să economisești imediat.

Pregătit să economisești? Click aici: [LINK ÎNREGISTRARE]

Întrebări? Răspunde la acest email!

Cu stimă,
{{your-name}}
{{your-phone}}',
true);

-- Slovak Templates
INSERT INTO email_templates (user_id, customer_type, language, subject, body, is_default) VALUES
(NULL, 'retail', 'sk',
'Ušetrite 25% na všetkých produktoch doTERRA!',
'Ahoj {{firstname}},

Všimol/a som si, že si nedávno nakúpil/a od doTERRA. Vedel/a si, že môžeš ušetriť 25% na každej objednávke s Veľkoobchodným členstvom?

Za pouhých 35 EUR (ktoré sa vrátia už pri prvej objednávke) získavaš:
✓ Automatickú zľavu 25% na všetky produkty
✓ Žiadne mesačné povinnosti k nákupu
✓ Prístup k exkluzívnym akciám
✓ Príležitosti k Produktu mesiaca

Zaberie to 2 minúty a hneď začneš šetriť.

Pripravený/á šetriť? Klikni tu: [ODKAZ NA REGISTRÁCIU]

Otázky? Len odpovedz na tento e-mail!

S pozdravom,
{{your-name}}
{{your-phone}}',
true);

