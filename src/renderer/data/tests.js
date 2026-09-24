// Practice Reading passages and Listening clips (original practice material, IELTS-style question types).
// Question types: tfng (True/False/Not Given), mcq (a = option index), gap (a = accepted words)

const READING = [
  {
    id: 'R1',
    title: 'Farming in the City',
    text: [
      'As cities grow, many planners are turning to urban farming to produce food closer to where people live. Rooftop gardens, indoor vertical farms and community allotments are appearing in cities from Singapore to Paris, often on land that was previously unused.',
      'Supporters argue that growing food locally reduces the distance it must travel, which lowers transport emissions and means vegetables reach shops fresher. Vertical farms, which stack crops in layers under artificial light, use far less water than traditional fields because the water is recycled.',
      'However, critics point out that indoor farms need a great deal of electricity, and unless this comes from renewable sources, the environmental benefits may be small. In addition, the crops grown so far are mostly leafy greens and herbs; staple foods such as wheat and rice are still produced in rural areas.',
      'Despite these limits, urban farms bring social advantages. Community gardens give residents a place to meet, and schools use them to teach children where food comes from. Many experts therefore see urban farming not as a replacement for traditional agriculture but as a useful addition to it.',
    ],
    questions: [
      { type: 'tfng', q: 'Urban farms are found only in Asian cities.', a: 'False' },
      { type: 'tfng', q: 'Vertical farms recycle the water they use.', a: 'True' },
      { type: 'tfng', q: 'Urban farming is cheaper than traditional farming.', a: 'Not Given' },
      { type: 'mcq', q: 'What is the main criticism of indoor farms?', opts: ['They produce too little food', 'They use a lot of electricity', 'They damage local soil', 'They take up too much land'], a: 1 },
      { type: 'gap', q: 'Most crops grown in urban farms are leafy ____ and herbs.', a: ['greens'] },
    ],
  },
  {
    id: 'R2',
    title: 'Why We Need Sleep',
    text: [
      'Sleep is not simply a period of rest; during the night the brain is highly active. Researchers have shown that sleep plays an important part in forming memories. Information learned during the day is thought to be sorted and stored while we sleep, which helps explain why students who sleep after studying often remember more than those who stay awake.',
      'Different stages of sleep seem to do different jobs. Deep sleep, which occurs mainly in the first half of the night, is linked to physical recovery and the storage of facts. Rapid eye movement (REM) sleep, which is more common towards morning, appears to be important for creativity and emotional processing.',
      'Most adults need between seven and nine hours of sleep, but many get much less. Long-term lack of sleep has been associated with weaker concentration, a higher risk of accidents and problems with mental health. Some employers have responded by allowing later start times or short daytime naps.',
      'Scientists caution, however, that not everything about sleep is understood. It remains unclear, for instance, why some people function well on relatively little sleep while others struggle.',
    ],
    questions: [
      { type: 'tfng', q: 'The brain is inactive during sleep.', a: 'False' },
      { type: 'tfng', q: 'Deep sleep happens mostly in the second half of the night.', a: 'False' },
      { type: 'tfng', q: 'All scientists agree on why some people need less sleep.', a: 'False' },
      { type: 'mcq', q: 'According to the passage, REM sleep is important for', opts: ['physical recovery', 'storing facts', 'creativity and emotions', 'preventing accidents'], a: 2 },
      { type: 'gap', q: 'Most adults need between seven and ____ hours of sleep.', a: ['nine', '9'] },
    ],
  },
  {
    id: 'R3',
    title: 'The Journey of Tea',
    text: [
      'Tea is the most widely consumed drink in the world after water. According to legend, it was discovered in China thousands of years ago when leaves from a wild tree fell into a pot of boiling water. Whether or not the story is true, tea was certainly being drunk in China as medicine long before it became an everyday beverage.',
      'Tea reached Europe in the seventeenth century through Portuguese and Dutch traders. At first it was an expensive luxury, but as trade expanded, prices fell and tea became popular among all social classes. In Britain, demand grew so quickly that the country began growing tea in its colonies, particularly in India.',
      'Today the largest producers are China and India, while Turkey has one of the highest levels of tea consumption per person. Different regions have developed their own traditions: tea is served with milk in Britain, brewed strong in small glasses in Turkey, and mixed with spices in parts of India.',
      'Although tea is often praised for its health benefits, researchers say that more evidence is needed before firm claims can be made.',
    ],
    questions: [
      { type: 'tfng', q: 'Tea was first used in China as a medicine.', a: 'True' },
      { type: 'tfng', q: 'Tea was cheap when it first arrived in Europe.', a: 'False' },
      { type: 'tfng', q: 'India is the largest consumer of tea per person.', a: 'Not Given' },
      { type: 'mcq', q: 'Why did Britain start growing tea in its colonies?', opts: ['Tea could not grow in Britain', 'Demand was growing quickly', 'China stopped exporting tea', 'Dutch traders demanded it'], a: 1 },
      { type: 'gap', q: 'In Turkey, tea is brewed strong and served in small ____.', a: ['glasses', 'glass'] },
    ],
  },
];

const LISTENING = [
  {
    id: 'L1',
    title: 'Booking a Library Tour',
    script:
      'Good morning, university library. How can I help you? — Hello, I would like to book a tour for new students. — Certainly. We run tours every Tuesday and Thursday. The Tuesday tour starts at ten thirty, and the Thursday one at two o\'clock. Each tour lasts forty-five minutes. — Tuesday would be better for me. Is there a charge? — No, it is free, but you need to bring your student card. We will meet at the main entrance, next to the café. — Great. And do I need to book online? — You can just give me your name now. — It\'s Amira Yilmaz. That\'s A-M-I-R-A, Y-I-L-M-A-Z. — Thank you, Amira. See you on Tuesday.',
    questions: [
      { type: 'mcq', q: 'What time does the Tuesday tour start?', opts: ['10:00', '10:30', '2:00', '2:45'], a: 1 },
      { type: 'gap', q: 'Each tour lasts ____ minutes.', a: ['forty-five', '45', 'forty five'] },
      { type: 'gap', q: 'The caller must bring her student ____.', a: ['card'] },
      { type: 'mcq', q: 'Where will the group meet?', opts: ['In the café', 'At the main entrance', 'In the reading room', 'At the reception desk'], a: 1 },
    ],
  },
  {
    id: 'L2',
    title: 'Lecture on Renewable Energy',
    script:
      'Today I would like to talk about renewable energy. Wind and solar power have become much cheaper over the last decade, and in some countries they are now the cheapest way to generate electricity. However, there is a major challenge: the wind does not always blow, and the sun does not always shine. This means we need effective ways of storing energy. Batteries are the most common solution at present, but they are expensive. Another approach is pumped hydro, where water is pumped uphill when electricity is cheap and released to generate power when demand is high. Finally, researchers are exploring hydrogen as a long-term storage option.',
    questions: [
      { type: 'mcq', q: 'What is the main challenge of wind and solar power?', opts: ['High cost', 'They are unreliable', 'They cause pollution', 'They need a lot of water'], a: 1 },
      { type: 'gap', q: 'The most common storage solution at present is ____.', a: ['batteries', 'battery'] },
      { type: 'tfng', q: 'Pumped hydro releases water when demand for electricity is low.', a: 'False' },
      { type: 'gap', q: 'Researchers are exploring ____ as a long-term storage option.', a: ['hydrogen'] },
    ],
  },
  {
    id: 'L3',
    title: 'Student Accommodation',
    script:
      'Hi, I am calling about the room advertised on the university noticeboard. — Yes, it is a double room in a shared house, about ten minutes from campus by bike. The rent is four hundred and eighty pounds a month, and that includes water and internet, but not electricity. — Is there a deposit? — Yes, one month\'s rent, which is returned at the end of the contract as long as there is no damage. The house has a shared kitchen and a small garden. Unfortunately, pets are not allowed. — That is fine. Can I see it this weekend? — Of course. Come on Saturday morning at eleven.',
    questions: [
      { type: 'gap', q: 'The monthly rent is £____.', a: ['480', 'four hundred and eighty'] },
      { type: 'mcq', q: 'Which is NOT included in the rent?', opts: ['Water', 'Internet', 'Electricity', 'Garden use'], a: 2 },
      { type: 'tfng', q: 'Pets are allowed in the house.', a: 'False' },
      { type: 'gap', q: 'The caller will visit on Saturday at ____ o\'clock.', a: ['11', 'eleven'] },
    ],
  },
];

// approximate raw-percentage -> band conversion used for reading and listening estimates
function pctToBand(pct) {
  const table = [[90, 8], [82, 7.5], [75, 7], [68, 6.5], [58, 6], [50, 5.5], [40, 5], [30, 4.5]];
  for (const [min, band] of table) if (pct >= min) return band;
  return 4;
}
