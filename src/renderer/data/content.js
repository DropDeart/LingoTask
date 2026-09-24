// Writing / speaking prompts and the study plan definition.

const WRITING_T2 = [
  { id: 'T2-1', q: 'Some people believe that university education should be free for everyone, while others think students should pay for it. Discuss both views and give your own opinion.' },
  { id: 'T2-2', q: 'In many countries, the amount of time people spend on social media is increasing. What are the causes of this, and what effects does it have on individuals and society?' },
  { id: 'T2-3', q: 'Some people think governments should spend money on public transport rather than building new roads. To what extent do you agree or disagree?' },
  { id: 'T2-4', q: 'Many people now work from home instead of in an office. Do the advantages of this development outweigh the disadvantages?' },
  { id: 'T2-5', q: 'Plastic waste is a serious threat to the environment. What problems does it cause, and what can be done to solve them?' },
  { id: 'T2-6', q: 'Some people believe that children should start learning a foreign language at primary school. Others think it is better to start at secondary school. Discuss both views and give your opinion.' },
  { id: 'T2-7', q: 'Traditional customs and cultures are disappearing because of globalisation. Is this a positive or negative development?' },
  { id: 'T2-8', q: 'Some people argue that competitive sport is essential for children, while others believe it does more harm than good. Discuss both sides and give your opinion.' },
  { id: 'T2-9', q: 'Artificial intelligence is becoming more common in workplaces. Do you think this will create more problems than opportunities?' },
  { id: 'T2-10', q: 'Many young people leave their home town to live in big cities. Why do they do this, and is it a positive or negative trend?' },
  { id: 'T2-11', q: 'Some people say that the best way to reduce crime is to give longer prison sentences. To what extent do you agree or disagree?' },
  { id: 'T2-12', q: 'Health care should be the responsibility of governments rather than individuals. To what extent do you agree or disagree?' },
];

// Academic Task 1: small data tables the learner describes in 150+ words
const WRITING_T1 = [
  { id: 'T1-1', q: 'The table shows the percentage of households with internet access in four countries.', cols: ['Country', '2005', '2010', '2015', '2020'], rows: [['Japan', '68', '78', '89', '93'], ['Brazil', '20', '38', '58', '74'], ['Turkey', '15', '42', '69', '88'], ['Kenya', '4', '10', '22', '40']] },
  { id: 'T1-2', q: 'The table shows the average monthly spending (in dollars) of a typical student on four categories.', cols: ['Category', 'Year 1', 'Year 2', 'Year 3'], rows: [['Housing', '420', '450', '480'], ['Food', '210', '200', '190'], ['Transport', '60', '75', '110'], ['Leisure', '90', '85', '70']] },
  { id: 'T1-3', q: 'The table shows the number of visitors (in thousands) to three museums over five years.', cols: ['Museum', '2018', '2019', '2020', '2021', '2022'], rows: [['Science', '540', '560', '210', '300', '520'], ['History', '410', '400', '150', '260', '430'], ['Art', '320', '350', '90', '180', '380']] },
  { id: 'T1-4', q: 'The table shows the proportion of energy (%) produced from different sources in a country.', cols: ['Source', '1990', '2000', '2010', '2020'], rows: [['Coal', '52', '44', '30', '15'], ['Gas', '25', '30', '33', '32'], ['Nuclear', '18', '17', '15', '12'], ['Renewables', '5', '9', '22', '41']] },
];

const SPEAKING = {
  p1: [
    { topic: 'Hometown', qs: ['Where is your hometown?', 'What do you like most about it?', 'Has it changed much in recent years?', 'Would you like to live there in the future?'] },
    { topic: 'Studies / Work', qs: ['Do you work or are you a student?', 'Why did you choose this field?', 'What do you find most difficult about it?', 'What would you like to do in the future?'] },
    { topic: 'Free time', qs: ['What do you do in your free time?', 'Do you prefer spending free time alone or with others?', 'Has your hobby changed since you were a child?', 'Is it important to have hobbies?'] },
    { topic: 'Technology', qs: ['How often do you use your phone?', 'What apps do you use most?', 'Do you think people depend on technology too much?', 'What technology would you like to have?'] },
    { topic: 'Food', qs: ['What kind of food do you enjoy?', 'Do you cook at home?', 'Has the food you eat changed since you were a child?', 'What is a traditional dish from your country?'] },
    { topic: 'Travel', qs: ['Do you like travelling?', 'Where did you go on your last trip?', 'Do you prefer travelling alone or in a group?', 'Where would you like to visit next?'] },
  ],
  p2: [
    { cue: 'Describe a person who has influenced you.', pts: ['who this person is', 'how you know them', 'what they did', 'and explain why they influenced you'], p3: ['Do you think role models are important for young people?', 'How has the influence of family changed over time?', 'Can celebrities be good role models?'] },
    { cue: 'Describe a place you visited that you found very interesting.', pts: ['where it is', 'when you went there', 'what you did there', 'and explain why you found it interesting'], p3: ['Why do people like to travel abroad?', 'What are the negative effects of tourism?', 'How might travel change in the future?'] },
    { cue: 'Describe a skill you would like to learn.', pts: ['what the skill is', 'why you want to learn it', 'how you would learn it', 'and explain how it would help you'], p3: ['Which skills are most important for young people today?', 'Is it better to learn skills at school or at work?', 'Do people learn faster as children?'] },
    { cue: 'Describe a time when you helped someone.', pts: ['who you helped', 'what the problem was', 'how you helped', 'and explain how you felt afterwards'], p3: ['Why do some people volunteer?', 'Should helping others be taught in schools?', 'Is it easier to help others today than in the past?'] },
    { cue: 'Describe a piece of technology you use a lot.', pts: ['what it is', 'how often you use it', 'what you use it for', 'and explain why it is important to you'], p3: ['How has technology changed education?', 'Are there any risks of relying on technology?', 'What will technology look like in 50 years?'] },
    { cue: 'Describe a book or film that made a strong impression on you.', pts: ['what it was', 'what it was about', 'when you read or watched it', 'and explain why it made an impression'], p3: ['Do people read less than in the past?', 'Should films be used in education?', 'Why are some stories popular in many cultures?'] },
  ],
};

// ---- Study plan: 6 steps stretched between the start date and the exam ----
// A task with `auto: [metric, target]` ticks itself off from real activity (see App.METRICS);
// the rest are manual checkboxes for work done outside the app.
const STEP_DEFS = [
  {
    title: 'Temel & Seviye Tespiti',
    focus: 'Akademik kelime tabanı, mevcut seviyeni ölç',
    tasks: [
      { text: 'İlk 25 akademik kelimeyi öğren', auto: ['academicLearned', 25] },
      { text: 'Zamanlar konusunu çalış (G1 + G2)', auto: ['grammarPassed', 2] },
      { text: 'Bir Task 2 denemesi yaz (250 kelime)', auto: ['writingsT2', 1] },
      { text: 'Bir Reading passage’ını süreli çöz', auto: ['readingDone', 1] },
      { text: 'Sınav kaydını yaptır ve tarihi doğrula' },
    ],
  },
  {
    title: 'Reading Stratejileri & Artikeller',
    focus: 'Skimming, scanning, True / False / Not Given, a / an / the',
    tasks: [
      { text: 'Toplam 50 akademik kelimeye ulaş', auto: ['academicLearned', 50] },
      { text: 'Artikel konusunu bitir (G3)', auto: ['grammarPassed', 3] },
      { text: '3 Reading testi çöz ve yanlışlarını analiz et', auto: ['readingDone', 3] },
      { text: '150 kelime tekrarını doğru bil', auto: ['reviewCorrect', 150] },
      { text: 'Skimming ve scanning tekniklerini çalış' },
    ],
  },
  {
    title: 'Writing Task 1 & Karmaşık Cümle',
    focus: 'Tablo betimleme, bağlaçlar, yan cümleler',
    tasks: [
      { text: 'Toplam 75 akademik kelimeye ulaş', auto: ['academicLearned', 75] },
      { text: 'Bağlaç ve relative clause konularını bitir (G4 + G5)', auto: ['grammarPassed', 5] },
      { text: '2 adet Task 1 yaz ve kontrol ettir', auto: ['writingsT1', 2] },
      { text: 'Bir yazını düzeltip tekrar değerlendir', auto: ['revisions', 1] },
      { text: 'Trend ve karşılaştırma kalıplarını ezberle' },
    ],
  },
  {
    title: 'Writing Task 2 & Pasif Yapı',
    focus: '4 essay türü, paragraf yapısı, argüman geliştirme',
    tasks: [
      { text: 'Toplam 100 akademik kelimeye ulaş', auto: ['academicLearned', 100] },
      { text: 'Pasif ve koşul cümlelerini bitir (G6 + G7)', auto: ['grammarPassed', 7] },
      { text: 'Toplam 5 essay yaz', auto: ['writingsT2', 5] },
      { text: '2 yazını düzeltilmiş haliyle tekrar değerlendir', auto: ['revisions', 2] },
      { text: 'Introduction ve conclusion şablonlarını oturt' },
    ],
  },
  {
    title: 'Listening & Speaking',
    focus: 'Akıcılık, Part 2 uzun konuşma, dinleme alışkanlığı',
    tasks: [
      { text: '3 Listening testi çöz', auto: ['listeningDone', 3] },
      { text: '4 Speaking kaydı yap ve analiz ettir', auto: ['speakings', 4] },
      { text: 'Sayılabilirlik ve karşılaştırma konularını bitir (G8 + G9)', auto: ['grammarPassed', 9] },
      { text: '400 kelime tekrarını doğru bil', auto: ['reviewCorrect', 400] },
      { text: 'Günlük 20 dk BBC / TED dinle' },
    ],
  },
  {
    title: 'Deneme Sınavı & Cilalama',
    focus: 'Tam deneme, zayıf alanları kapat, sınav günü hazırlığı',
    tasks: [
      { text: 'Tüm gramer konularını tamamla', auto: ['grammarPassed', 10] },
      { text: 'Toplam 8 essay yaz', auto: ['writingsT2', 8] },
      { text: 'Tüm Reading ve Listening testlerini çöz', auto: ['practiceDone', 12] },
      { text: 'Speaking mock yap (öğretmen / arkadaş)' },
      { text: 'Sınav günü hazırlığı: kimlik, yol, kurallar' },
    ],
  },
];

// which checkpoint content belongs to which step (index = step number - 1)
const STEP_TESTS = [
  { reading: 'R1', listening: 'L1', writing: 'T2-1', speaking: 0, grammar: 'G1' },
  { reading: 'R2', listening: 'L2', writing: 'T2-2', speaking: 1, grammar: 'G3' },
  { reading: 'R3', listening: 'L3', writing: 'T1-1', speaking: 2, grammar: 'G4' },
  { reading: 'R1', listening: 'L1', writing: 'T2-4', speaking: 3, grammar: 'G6' },
  { reading: 'R2', listening: 'L2', writing: 'T2-9', speaking: 4, grammar: 'G8' },
  { reading: 'R3', listening: 'L3', writing: 'T2-12', speaking: 5, grammar: 'G10' },
];

const DEFAULT_SETTINGS = { examDate: '2027-01-15', target: 6.5, startDate: null, dailyNew: 8, voice: '', speechRate: -1, netMode: 'auto' };
