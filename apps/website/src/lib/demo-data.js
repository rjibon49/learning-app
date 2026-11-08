// Clearly labeled demonstration content shown ONLY when the API cannot be reached.
// These items are not represented as records saved in your CMS.
export const demoApps = [
  { id: 'demo-a1', level: 'A1', name: 'German A1 — Beginner', slug: 'german-a1', isActive: true },
  { id: 'demo-a2', level: 'A2', name: 'German A2 — Elementary', slug: 'german-a2', isActive: true },
  { id: 'demo-b1', level: 'B1', name: 'German B1 — Intermediate', slug: 'german-b1', isActive: true },
  { id: 'demo-b2', level: 'B2', name: 'German B2 — Upper Intermediate', slug: 'german-b2', isActive: true },
  { id: 'demo-c1', level: 'C1', name: 'German C1 — Advanced', slug: 'german-c1', isActive: true },
];
export const demoCourses = [
  { id: 'demo-c1', appId: 'demo-a1', title: 'Your first German words', slug: 'first-words', description: 'Make introductions, exchange greetings, and find the confidence to speak out loud.', status: 'PUBLISHED', sortOrder: 1, _count: { modules: 3 } },
  { id: 'demo-c2', appId: 'demo-a1', title: 'Everyday conversations', slug: 'everyday-conversations', description: 'Order coffee, ask questions and handle the little moments in daily life.', status: 'PUBLISHED', sortOrder: 2, _count: { modules: 2 } },
  { id: 'demo-c3', appId: 'demo-a1', title: 'Grammar made simple', slug: 'grammar-made-simple', description: 'Master der, die and das, sentence structure and the fundamentals.', status: 'PUBLISHED', sortOrder: 3, _count: { modules: 2 } },
  { id: 'demo-c4', appId: 'demo-a2', title: 'Life in Germany', slug: 'life-in-germany', description: 'Navigate shopping, travel and social situations with confidence.', status: 'PUBLISHED', sortOrder: 1, _count: { modules: 2 } },
  { id: 'demo-c5', appId: 'demo-b1', title: 'Speak with confidence', slug: 'speak-with-confidence', description: 'Build your opinions, tell stories and express yourself clearly.', status: 'PUBLISHED', sortOrder: 1, _count: { modules: 2 } },
  { id: 'demo-c6', appId: 'demo-b2', title: 'Beyond the basics', slug: 'beyond-the-basics', description: 'Take on richer texts, persuasive arguments and complex expression.', status: 'PUBLISHED', sortOrder: 1, _count: { modules: 2 } },
  { id: 'demo-c7', appId: 'demo-c1', title: 'Fluent expression', slug: 'fluent-expression', description: 'Polish nuance, fluency and confident academic communication.', status: 'PUBLISHED', sortOrder: 1, _count: { modules: 2 } },
];
export const demoModules = [
  { id: 'demo-m1', courseId: 'demo-c1', title: 'Hello, Germany!', slug: 'hello-germany', description: 'The words that open doors.', status: 'PUBLISHED', sortOrder: 1, _count: { lessons: 3 } },
  { id: 'demo-m2', courseId: 'demo-c1', title: 'Meet and greet', slug: 'meet-and-greet', description: 'Introduce yourself with ease.', status: 'PUBLISHED', sortOrder: 2, _count: { lessons: 2 } },
  { id: 'demo-m3', courseId: 'demo-c1', title: 'Numbers and time', slug: 'numbers-and-time', description: 'Understand everyday numbers.', status: 'PUBLISHED', sortOrder: 3, _count: { lessons: 2 } },
  { id: 'demo-m4', courseId: 'demo-c2', title: 'At the café', slug: 'at-the-cafe', status: 'PUBLISHED', sortOrder: 1, _count: { lessons: 2 } },
  { id: 'demo-m5', courseId: 'demo-c2', title: 'Getting around', slug: 'getting-around', status: 'PUBLISHED', sortOrder: 2, _count: { lessons: 1 } },
  { id: 'demo-m6', courseId: 'demo-c3', title: 'Sentence essentials', slug: 'sentence-essentials', status: 'PUBLISHED', sortOrder: 1, _count: { lessons: 2 } },
  { id: 'demo-m7', courseId: 'demo-c3', title: 'Articles and nouns', slug: 'articles-and-nouns', status: 'PUBLISHED', sortOrder: 2, _count: { lessons: 2 } },
  ...['demo-c4','demo-c5','demo-c6','demo-c7'].map((id, i) => ({ id: `demo-m${i+8}`, courseId:id, title:['Daily life essentials','Sharing your ideas','Advanced communication','Writing with precision'][i], status:'PUBLISHED', sortOrder:1, _count: { lessons: 2 } })),
];
const sampleLessons = [
  ['Greetings that matter','Hallo! Guten Morgen!','Hello! Good morning!','হ্যালো! সুপ্রভাত!','5'],
  ['Saying goodbye','Auf Wiedersehen! Bis bald!','Goodbye! See you soon!','বিদায়! শীঘ্রই দেখা হবে!','6'],
  ['Please and thank you','Bitte. Danke schön.','Please. Thank you very much.','অনুগ্রহ করে। অনেক ধন্যবাদ।','4'],
  ['My name is…','Ich heiße Alex. Wie heißt du?','My name is Alex. What is your name?','আমার নাম অ্যালেক্স। তোমার নাম কী?','7'],
  ['Where are you from?','Ich komme aus Bangladesch.','I come from Bangladesh.','আমি বাংলাদেশ থেকে এসেছি।','6'],
  ['Counting from one to ten','Eins, zwei, drei, vier, fünf.','One, two, three, four, five.','এক, দুই, তিন, চার, পাঁচ।','7'],
  ['What time is it?','Wie spät ist es?','What time is it?','এখন কয়টা বাজে?','6'],
  ['Ordering your first coffee','Ich möchte einen Kaffee, bitte.','I would like a coffee, please.','আমি এক কাপ কফি চাই, অনুগ্রহ করে।','8'],
  ['At the restaurant','Die Rechnung, bitte.','The bill, please.','বিলটা দিন, অনুগ্রহ করে।','7'],
  ['Asking for directions','Wo ist der Bahnhof?','Where is the train station?','ট্রেন স্টেশন কোথায়?','6'],
  ['Building your first sentence','Ich lerne Deutsch.','I am learning German.','আমি জার্মান শিখছি।','6'],
  ['Simple questions','Sprichst du Englisch?','Do you speak English?','তুমি কি ইংরেজি বলতে পারো?','7'],
  ['The three articles','Der Mann, die Frau, das Kind.','The man, the woman, the child.','পুরুষ, নারী, শিশু।','7'],
  ['Plural forms','Ein Buch, zwei Bücher.','One book, two books.','একটি বই, দুটি বই।','5'],
];
export const demoLessons = [...demoModules.flatMap((m, mi) => {
  const source = mi === 0 ? sampleLessons.slice(0,3) : mi===1 ? sampleLessons.slice(3,5) : mi===2 ? sampleLessons.slice(5,7) : mi===3 ? sampleLessons.slice(7,9) : mi===4 ? sampleLessons.slice(9,10) : mi===5 ? sampleLessons.slice(10,12) : mi===6 ? sampleLessons.slice(12,14) : sampleLessons.slice(mi%7,mi%7+2);
  return source.map((entry,i) => ({ id:`${m.id}-l${i+1}`, moduleId:m.id, title:entry[0], slug:`lesson-${i+1}`, germanText:entry[1]+'\n\nSprich langsam und deutlich. Wiederhole den Satz dreimal.', englishText:entry[2]+'\n\nSpeak slowly and clearly. Repeat the sentence three times.', banglaText:entry[3]+'\n\nধীরে ও স্পষ্টভাবে বলুন। বাক্যটি তিনবার পুনরাবৃত্তি করুন।', estimatedMinutes:Number(entry[4]), status:'PUBLISHED', sortOrder:i+1 }));
})];
export const demoCategories = [
  { id:'cat-1', appId:'demo-a1', name:'Everyday words', germanName:'Alltag', banglaName:'দৈনন্দিন', slug:'everyday', isActive:true, sortOrder:1 },
  { id:'cat-2', appId:'demo-a1', name:'Food & drinks', germanName:'Essen & Trinken', banglaName:'খাবার', slug:'food', isActive:true, sortOrder:2 },
  { id:'cat-3', appId:'demo-a1', name:'People & family', germanName:'Menschen', banglaName:'মানুষ', slug:'people', isActive:true, sortOrder:3 },
  { id:'cat-4', appId:'demo-a1', name:'Places & travel', germanName:'Reisen', banglaName:'ভ্রমণ', slug:'travel', isActive:true, sortOrder:4 },
];
const wordRows = [
  ['Hallo','Hello','হ্যালো','','cat-1','Hallo! Wie geht es dir?','Hello! How are you?'],
  ['Danke','Thank you','ধন্যবাদ','','cat-1','Danke für deine Hilfe.','Thank you for your help.'],
  ['Bitte','Please / You’re welcome','অনুগ্রহ করে','','cat-1','Ein Wasser, bitte.','One water, please.'],
  ['Guten Morgen','Good morning','সুপ্রভাত','','cat-1','Guten Morgen, Anna!','Good morning, Anna!'],
  ['Tschüss','Bye','বিদায়','','cat-1','Tschüss! Bis morgen!','Bye! See you tomorrow!'],
  ['Wasser','Water','পানি','das','cat-2','Ich trinke Wasser.','I drink water.'],
  ['Brot','Bread','রুটি','das','cat-2','Das Brot ist frisch.','The bread is fresh.'],
  ['Kaffee','Coffee','কফি','der','cat-2','Der Kaffee ist heiß.','The coffee is hot.'],
  ['Apfel','Apple','আপেল','der','cat-2','Der Apfel ist rot.','The apple is red.'],
  ['Milch','Milk','দুধ','die','cat-2','Die Milch ist kalt.','The milk is cold.'],
  ['Freund','Friend','বন্ধু','der','cat-3','Mein Freund wohnt in Berlin.','My friend lives in Berlin.'],
  ['Familie','Family','পরিবার','die','cat-3','Meine Familie ist groß.','My family is big.'],
  ['Mutter','Mother','মা','die','cat-3','Meine Mutter ist nett.','My mother is kind.'],
  ['Kind','Child','শিশু','das','cat-3','Das Kind spielt.','The child plays.'],
  ['Haus','House','বাড়ি','das','cat-4','Das Haus ist schön.','The house is beautiful.'],
  ['Bahnhof','Train station','রেলস্টেশন','der','cat-4','Wo ist der Bahnhof?','Where is the train station?'],
  ['Stadt','City','শহর','die','cat-4','Die Stadt ist groß.','The city is big.'],
  ['Straße','Street','রাস্তা','die','cat-4','Diese Straße ist lang.','This street is long.'],
  ['Buch','Book','বই','das','cat-1','Das Buch ist interessant.','The book is interesting.'],
  ['Zeit','Time','সময়','die','cat-1','Ich habe keine Zeit.','I have no time.'],
];
export const demoVocabulary = wordRows.map((r,i) => ({ id:`demo-v${i+1}`, appId:'demo-a1', article:r[3], german:r[0], english:r[1], bangla:r[2], categoryId:r[4], category:demoCategories.find(c=>c.id===r[4]), exampleGerman:r[5], exampleEnglish:r[6], imageUrl:null, audioUrl:null, difficulty:i<11?'EASY':'MEDIUM', status:'PUBLISHED', isPublished:true }));
