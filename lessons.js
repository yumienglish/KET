/* =====================================================================
   KET Adventure – DỮ LIỆU BÀI HỌC
   ---------------------------------------------------------------------
   • OPEN_WEEK: tuần đang mở. Mỗi tuần thêm 1 bài vào LESSONS rồi tăng số này.
     Các bài tuần trước vẫn mở để học sinh xem lại.
   • Chữ highlight (bấm xem nghĩa) viết trong {{từ}} hoặc {{khoá|chữ hiển thị}}; khoá phải có trong VOCAB.
   • newWords = danh sách "New words" đầu bài (để chép vở): chỉ từ A2 trở lên / liên quan ngữ pháp,
     A1 chỉ lấy khi ít gặp. Từ nằm trong câu hỏi, đề bài KHÔNG đưa vào (vẫn highlight được).
   • ai: tên hình minh hoạ ChatGPT img/ai/<tên>.jpg (chưa có thì tự ẩn) · cheer: câu linh vật nói (mặc định theo dạng bài)
   • Đáp án nhiều cách viết đúng thì ngăn bằng dấu |   (show = đáp án hiện cho HS xem)
   ===================================================================== */
const OPEN_WEEK = 1;

// Máy chủ nhận bài (Code.gs dùng chung với các trang BTVN khác)
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyAom9bBpL0ms0VD7_bz5w691011llkFzttYSjKDyRyMCjLLeUZ4EZGGJLtLMFWuiV4sA/exec';

/* ---------- TỪ MỚI: w = từ đọc to, ipa, vi = nghĩa tiếng Việt ---------- */
const VOCAB = {
  'reasons':        { w: 'reasons', ipa: '/ˈriːzənz/', vi: 'những lý do' },
  'important':      { w: 'important', ipa: '/ɪmˈpɔːtənt/', vi: 'quan trọng' },
  'true':           { w: 'true', ipa: '/truː/', vi: 'đúng, thật' },
  'always':         { w: 'always', ipa: '/ˈɔːlweɪz/', vi: 'luôn luôn' },
  'be there for you': { w: 'be there for you', ipa: '/bi ðeə fə juː/', vi: 'luôn ở bên cạnh, sẵn sàng giúp bạn' },
  'alone':          { w: 'alone', ipa: '/əˈləʊn/', vi: 'một mình' },
  'funny':          { w: 'funny', ipa: '/ˈfʌni/', vi: 'buồn cười, vui nhộn' },
  'text messages':  { w: 'text messages', ipa: '/tekst ˈmesɪdʒɪz/', vi: 'tin nhắn (điện thoại)' },
  'tell lies':      { w: 'tell lies', ipa: '/tel laɪz/', vi: 'nói dối' },
  'go shopping':    { w: 'go shopping', ipa: '/ɡəʊ ˈʃɒpɪŋ/', vi: 'đi mua sắm' },
  'forget':         { w: 'forget', ipa: '/fəˈɡet/', vi: 'quên' },
  'together':       { w: 'together', ipa: '/təˈɡeðə/', vi: 'cùng nhau' },
  'chat':           { w: 'chat', ipa: '/tʃæt/', vi: 'trò chuyện, tán gẫu' },
  'for hours':      { w: 'for hours', ipa: '/fər ˈaʊəz/', vi: 'hàng giờ liền' },
  'favourite':      { w: 'favourite', ipa: '/ˈfeɪvərɪt/', vi: 'yêu thích nhất' },
  'fridge':         { w: 'fridge', ipa: '/frɪdʒ/', vi: 'tủ lạnh' },
  'party':          { w: 'party', ipa: '/ˈpɑːti/', vi: 'bữa tiệc (số nhiều: parties)' },
  'without':        { w: 'without', ipa: '/wɪˈðaʊt/', vi: 'không có, thiếu' },
  'laugh':          { w: 'laugh', ipa: '/lɑːf/', vi: 'cười (thành tiếng)' },
  'spelling':       { w: 'spelling', ipa: '/ˈspelɪŋ/', vi: 'đánh vần, chính tả' },
  'letters':        { w: 'letters', ipa: '/ˈletəz/', vi: 'chữ cái' },
  'famous':         { w: 'famous', ipa: '/ˈfeɪməs/', vi: 'nổi tiếng' },
  'tennis player':  { w: 'tennis player', ipa: '/ˈtenɪs ˌpleɪə/', vi: 'vận động viên quần vợt' },
  'film star':      { w: 'film star', ipa: '/ˈfɪlm stɑː/', vi: 'ngôi sao điện ảnh' },
  'cartoon':        { w: 'cartoon', ipa: '/kɑːˈtuːn/', vi: 'phim hoạt hình' },
  'footballer':     { w: 'footballer', ipa: '/ˈfʊtbɔːlə/', vi: 'cầu thủ bóng đá' },
  'popular':        { w: 'popular', ipa: '/ˈpɒpjələ/', vi: 'được nhiều người yêu thích' },
  'band':           { w: 'band', ipa: '/bænd/', vi: 'ban nhạc' },
  'teenagers':      { w: 'teenagers', ipa: '/ˈtiːneɪdʒəz/', vi: 'thanh thiếu niên (13–19 tuổi)' },
  'best friend':    { w: 'best friend', ipa: '/ˌbest ˈfrend/', vi: 'bạn thân nhất' },
  'complete':       { w: 'complete', ipa: '/kəmˈpliːt/', vi: 'hoàn thành, điền cho đủ' },
  'information':    { w: 'information', ipa: '/ˌɪnfəˈmeɪʃən/', vi: 'thông tin' },
  'meet':           { w: 'meet', ipa: '/miːt/', vi: 'gặp, gặp nhau' },
  'special':        { w: 'special', ipa: '/ˈspeʃəl/', vi: 'đặc biệt' },
  'river':          { w: 'river', ipa: '/ˈrɪvə/', vi: 'dòng sông' },
  'help sb with sth': { w: 'help someone with something', ipa: '/help ˈsʌmwʌn wɪð ˈsʌmθɪŋ/', vi: 'giúp ai làm việc gì (VD: help me with my homework – giúp mình làm bài tập)' },

  /* 1.2 Borrow this! */
  'borrow':         { w: 'borrow', ipa: '/ˈbɒrəʊ/', vi: 'mượn (của ai đó)' },
  'lend':           { w: 'lend', ipa: '/lend/', vi: 'cho (ai) mượn' },
  'give back':      { w: 'give back', ipa: '/ɡɪv ˈbæk/', vi: 'trả lại' },
  'magazines':      { w: 'magazines', ipa: '/ˌmæɡəˈziːnz/', vi: 'tạp chí' },
  'make-up':        { w: 'make-up', ipa: '/ˈmeɪk ʌp/', vi: 'đồ trang điểm' },
  'mistakes':       { w: 'mistakes', ipa: '/mɪˈsteɪks/', vi: 'lỗi sai' },
  'correct':        { w: 'correct', ipa: '/kəˈrekt/', vi: 'đúng; sửa (cho đúng)' },
  'adjective':      { w: 'adjective', ipa: '/ˈædʒɪktɪv/', vi: 'tính từ (từ miêu tả người, vật)' },
  'amazing':        { w: 'amazing', ipa: '/əˈmeɪzɪŋ/', vi: 'tuyệt vời, đáng kinh ngạc' },
  'free':           { w: 'free', ipa: '/friː/', vi: 'rảnh rỗi (không bận)' },
  'horrible':       { w: 'horrible', ipa: '/ˈhɒrəbl/', vi: 'kinh khủng, rất dở' },
  'pleased':        { w: 'pleased', ipa: '/pliːzd/', vi: 'vui, hài lòng' },
  'popular':        { w: 'popular', ipa: '/ˈpɒpjələ/', vi: 'được nhiều người yêu thích' },
  'sick':           { w: 'sick', ipa: '/sɪk/', vi: 'ốm, bệnh' },
  'worried':        { w: 'worried', ipa: '/ˈwʌrid/', vi: 'lo lắng' },
  'rock concert':   { w: 'rock concert', ipa: '/ˈrɒk ˌkɒnsət/', vi: 'buổi hoà nhạc rock' },
  'flu':            { w: 'flu', ipa: '/fluː/', vi: 'bệnh cúm' },
  'sweet':          { w: 'sweet', ipa: '/swiːt/', vi: 'viên kẹo (danh từ)' },
  'postcard':       { w: 'postcard', ipa: '/ˈpəʊstkɑːd/', vi: 'bưu thiếp' },
  'flat':           { w: 'flat', ipa: '/flæt/', vi: 'căn hộ' },
};

/* ---------- BÀI HỌC THEO TUẦN ---------- */
const LESSONS = {
  1: {
    code: '1.1', title: 'Friends for ever', unit: 'Unit 1 · Friends',
    newWords: ['be there for you', 'alone', 'text messages', 'tell lies', 'forget', 'chat', 'for hours', 'help sb with sth', 'without', 'special'],
    ex: [
      /* Exercise 1 – tự đánh giá, chạm vào tranh (sách: Ex 1) */
      { id: '1', type: 'reasons',
        title: 'Twelve reasons why friends are great!',
        how: 'Here are some {{reasons}} why friends are {{important}}. Which are {{true}} for you? Tap them! Then choose the best reason ⭐.',
        img: 'reasons.jpg',
        // vùng chạm trên tranh: [trái, trên, phải, dưới] theo % kích thước tranh
        zones: {
          1: [0, 15.4, 30.4, 39.2], 2: [30.8, 16.3, 55.4, 43.8], 3: [55.8, 15, 82.1, 43.3], 4: [82.1, 19.2, 100, 40],
          5: [0, 40, 32.9, 65.8], 6: [32.9, 44.2, 54.2, 70], 8: [71.7, 43.3, 100, 66.7], 7: [50.8, 44.6, 71.7, 65.8],
          9: [0, 66.3, 26.7, 100], 10: [26.7, 73.3, 52.5, 98.3], 11: [52.5, 67.1, 77.5, 100], 12: [77.5, 67.9, 100, 98.3],
        },
        reasons: {
          1: 'Friends are {{always}} {{be there for you|there for you}}.',
          2: 'It isn’t fun to watch television {{alone}}.',
          3: 'You get {{funny}} {{text messages}} from them.',
          4: 'They don’t {{tell lies|tell you lies}}.',
          5: 'You have someone to {{go shopping}} with.',
          6: 'Friends don’t {{forget}} your birthday.',
          7: 'It’s great to go on the PlayStation {{together}}.',
          8: 'You can {{chat}} about football {{for hours}}.',
          9: 'Your best friend has your {{favourite}} ice cream in the {{fridge}}.',
          10: 'They {{help sb with sth|help you with}} your homework.',
          11: '{{party|Parties}} {{without}} your friends aren’t good!',
          12: 'Friends make you {{laugh}}.',
        } },

      /* Exercise 2 – nghe đánh vần (sách: Ex 3) */
      { id: '3', type: 'spell', track: '1-02', ai: 'k1-spelling',
        title: 'Pronunciation: spelling',
        how: '{{spelling|Spelling}} is {{important}} in the Key exam. Listen and write down the {{letters}} you hear. What {{famous}} names do the letters spell?',
        items: [
          { key: 'Novak Djokovic', hint: 'a {{tennis player}}' },
          { key: 'Penelope Cruz', hint: 'a {{film star}}' },
          { key: 'Bart Simpson', hint: 'a boy in a {{cartoon}}' },
          { key: 'Taye Taiwo', hint: 'a {{footballer}}' },
          { key: 'The Hobbit', hint: 'a {{popular}} film' },
          { key: 'The Foo Fighters', hint: 'an American {{band}}' },
        ] },

      /* Exercise 3 – nghe điền thông tin (sách: Ex 4) */
      { id: '4', type: 'info', track: '1-03', ai: 'k1-best-friends',
        title: 'Listening: best friends',
        how: 'Listen to Maria asking four {{teenagers}} about their {{best friend|best friends}}. {{complete|Complete}} the {{information}}.',
        people: [
          { name: 'Matt', img: 'matt.jpg', color: '#3a86ff', rows: [
            { q: '{{best friend|Best friend}} is', ex: 'Jonny' },
            { q: 'How old is he?', key: '13|thirteen', show: '13' },
            { q: 'What do they do {{together}}?', key: 'play football|football|play soccer|playing football|they play football', show: 'play football' },
          ] },
          { name: 'Elena', img: 'elena.jpg', color: '#ff4d8d', rows: [
            { q: '{{best friend|Best friend}} is', key: 'Raquel', show: 'Raquel' },
            { q: 'When do they {{meet}}?', key: 'every day|everyday|meet every day|every day at school|every day and at weekends', show: 'every day' },
          ] },
          { name: 'Kelly-Anne', img: 'kelly.jpg', color: '#e9a800', rows: [
            { q: '{{best friend|Best friend}} is', key: 'Vicky', show: 'Vicky' },
            { q: 'Why is she {{special}}?', key: 'her sister|sister|she is her sister|she is her little sister|she is my sister|my sister|she is kelly anne s sister|she s her sister', show: 'She’s her sister.' },
            { q: 'How old is Kelly-Anne?', key: '13|thirteen', show: '13' },
          ] },
          { name: 'Tom', img: 'tom.jpg', color: '#2bb673', rows: [
            { q: '{{best friend|Best friend}} is', key: 'Lucky|his dog|Lucky his dog|his dog Lucky|Lucky the dog|Lucky a dog|Lucky dog|Lucky my dog', show: 'Lucky (his dog)' },
            { q: 'Where do they go {{together}}?', key: 'to the river|river|go to the river|to river', show: 'to the river' },
          ] },
        ] },

      /* Exercise 4 – speaking: nghe câu hỏi (không chữ) và ghi âm câu trả lời (sách: Ex 5) */
      { id: '5', type: 'speak', ai: 'k1-speaking',
        title: 'Speaking: answer Maria’s questions',
        how: 'Listen to Maria’s questions. There is no text, so listen carefully! Then record a short answer about <b>your</b> best friend.',
        tip: { title: 'Useful words', lines: ['Well …', 'That’s easy.', 'That’s difficult.', 'That’s right.'] },
        clips: [
          { audio: '1-04-q1', q: 'What’s your best friend called?' },
          { audio: '1-04-q2', q: 'Can you spell that?' },
          { audio: '1-04-q3', q: 'How old is he or she?' },
          { audio: '1-04-q4', q: 'When do you meet?' },
          { audio: '1-04-q5', q: 'Where do you go together?' },
          { audio: '1-04-q6', q: 'What do you do together?' },
          { audio: '1-04-q7', q: 'Why is your friend special?', newWord: 'special' },
        ] },
    ],
  },

  /* ===================== TUẦN 2 – 1.2 Borrow this! ===================== */
  2: {
    code: '1.2', title: 'Borrow this!', unit: 'Unit 1 · Friends',
    newWords: ['borrow', 'magazines', 'make-up', 'amazing', 'free', 'horrible', 'pleased', 'popular', 'sick', 'worried', 'rock concert', 'flu', 'sweet'],
    // Ô ngữ pháp: tiếng Việt, rất ngắn. Ví dụ KHÔNG trùng câu / động từ trong bài tập.
    grammar: `
      <h4>1. Câu hỏi Yes/No</h4>
      <ul>
        <li><b>be</b>, <b>can</b>: đưa lên trước chủ ngữ. <i>You are tired. → <b>Are</b> you tired?</i> · <i><b>Can</b> she swim?</i></li>
        <li><b>have got</b>: <b>Have/Has</b> đứng đầu, <b>got</b> đứng sau chủ ngữ. <i><b>Has</b> Tom <b>got</b> a cat?</i></li>
        <li>Động từ thường: thêm <b>Do / Does</b> ở đầu. <i><b>Do</b> you like pizza? · <b>Does</b> she play tennis?</i></li>
      </ul>
      <h4>2. Câu hỏi có từ để hỏi (What, Where, When, Who, Why, How…)</h4>
      <ul>
        <li>Từ để hỏi đứng đầu, phần sau giống câu Yes/No.</li>
        <li><i>What <b>is</b> his name? · Where <b>can</b> we eat? · What time <b>does</b> the film start?</i></li>
      </ul>
      <h4>3. Rủ bạn làm gì</h4>
      <ul>
        <li><b>How about + V-ing…?</b> <i>How about <b>going</b> to the park?</i></li>
        <li><b>Why don’t we + V…?</b> <i>Why don’t we <b>play</b> football?</i></li>
      </ul>`,
    ex: [
      /* Mission 1 – sách Ex 1: 2 câu hỏi → ghi âm trả lời (câu hỏi hiện chữ) */
      { id: '1', type: 'speak', ai: 'k2-lend',
        title: 'Speaking: lending things',
        how: 'Read the questions and record your answers. Use the key words to help you.',
        tip: { title: 'Key words', lines: ['books', 'clothes', 'computer games', 'DVDs', 'magazines', 'make-up', 'money'] },
        clips: [
          { q: 'What things do you {{lend}} your friends?' },
          { q: 'Do they always {{give back|give them back}}?' },
        ] },

      /* Mission 2 – sách Ex 4: tìm câu sai, viết lại cho đúng (khung từ để chèn) */
      { id: '4', type: 'fixit', ai: 'k2-mistakes',
        title: 'Find the mistakes',
        how: 'Students wrote these questions. Five have {{mistakes}} and two are {{correct}}. Is each question right or wrong? {{correct|Correct}} the wrong ones. The words in the box can help you.',
        vi: 'Chọn ✅ nếu câu đúng, ❌ nếu câu sai. Câu sai thì viết lại cho đúng (chạm vào từ trong khung để chèn).',
        bank: ['do', 'does', 'are', 'is', 'did', 'meet', 'meeting'],
        items: [
          { t: 'When you want to come here?', fix: 'When do you want to come here?', h: 'Câu hỏi với động từ thường (want) cần thêm trợ động từ.' },
          { t: 'Where you are now?', fix: 'Where are you now?', h: 'Với động từ be: be đứng trước chủ ngữ.' },
          { t: 'How about meet me at 7 o’clock?', fix: 'How about meeting me at 7 o’clock?|How about meeting me at seven o’clock?', h: 'Sau How about, động từ phải đổi dạng. Xem mục 3 trong ô Grammar.' },
          { t: 'Why don’t we meet at the station?', fix: null },
          { t: 'Why you think it is interesting?', fix: 'Why do you think it is interesting?', h: 'Câu hỏi với động từ thường (think) cần thêm trợ động từ.' },
          { t: 'What do you want to buy?', fix: null },
          { t: 'Who he does like?', fix: 'Who does he like?', h: 'Xem lại trật tự: trợ động từ đứng TRƯỚC chủ ngữ.' },
        ] },

      /* Mission 3 – sách Ex 5: viết câu hỏi từ gợi ý */
      { id: '5', type: 'write', ai: 'k2-questions',
        title: 'Make questions',
        how: 'Write the questions. Add the missing words.',
        example: { cue: 'Why / you / happy?', a: 'Why are you happy?' },
        items: [
          { cue: 'Where / you / live?', key: 'Where do you live?', h: 'live là động từ thường → cần trợ động từ.' },
          { cue: 'What / your dad’s / first name?', key: 'What’s your dad’s first name?|What is your dad’s first name?', h: 'Thiếu động từ be.' },
          { cue: 'When / this lesson / finish?', key: 'When does this lesson finish?', h: 'Chủ ngữ số ít (this lesson) + động từ thường.' },
          { cue: 'Who / special friend?', key: 'Who is your special friend?|Who’s your special friend?', h: 'Thiếu động từ be và một từ chỉ “của bạn”.' },
          { cue: 'How / lending me …?', re: '^how about lending me [a-z]', show: 'How about lending me your bike (tomorrow)?', h: 'Rủ / nhờ bạn: How about + V-ing…? Thêm đồ vật em muốn mượn ở cuối.' },
        ] },

      /* Mission 4 – sách Ex 6: điền tính từ (khung từ bên cạnh) + chạm tìm thêm 3 tính từ */
      { id: '6', type: 'fill', ai: 'k2-feelings',
        title: 'Vocabulary: adjectives',
        how: 'Complete the sentences with an {{adjective}} from the box. There is one extra adjective.',
        box: ['amazing', 'free', 'horrible', '~lucky', 'pleased', 'popular', 'sick', 'true', 'worried'],
        example: 'Maria’s so [[lucky]] – she’s got two tickets for tonight’s {{rock concert}}!',
        items: [
          { t: 'My mum’s [[sick]] – she’s in bed with {{flu}}.', h: 'Mẹ đang nằm trên giường vì bị cúm.' },
          { t: 'Are you [[free]] tonight? Let’s go out!', h: 'Rủ đi chơi tối nay → hỏi bạn có bận không.' },
          { t: 'This {{sweet}} is really [[horrible]]! Can I have a different one?', h: 'Muốn đổi viên kẹo khác → viên này thế nào?' },
          { t: 'I’m really [[pleased]] to see you. How are you?', h: 'Gặp bạn thì cảm thấy thế nào?' },
          { t: 'Don’t look so [[worried]] – I’m not angry!', h: 'Đọc vế sau: “I’m not angry!” Bạn kia đang có vẻ mặt ra sao?' },
          { t: 'Your new phone is [[amazing]]! I want one.', h: 'Em cũng muốn có một cái → nó rất…' },
          { t: 'Why is this cartoon so [[popular]]? I think it’s really boring!', h: 'Nhiều người thích xem, nhưng bạn này thấy chán.' },
        ],
        // phần 2: chạm 3 tính từ khác trong các câu (new cũng là tính từ → chấp nhận)
        adj: { how: 'Find three more adjectives in the sentences. Tap them!', valid: ['different', 'angry', 'boring', 'new'], show: 'different, angry, boring (new is OK too)' } },

      /* Mission 5 – Exam folder 1: Listening Part 1 (mỗi câu 1 đoạn audio, bỏ lời dẫn) */
      { id: 'L', type: 'pick',
        title: 'Listening Part 1: short conversations',
        how: 'Listen to each conversation and choose the right answer (A, B or C).',
        items: [
          { q: 'What is the man buying for his lunch?', audio: '1-05-q1', img: ['l12/q1A.jpg', 'l12/q1B.jpg', 'l12/q1C.jpg'], desc: ['sandwiches', 'soup', 'pizza'], key: 'C', h: 'Có 2 người được nhắc đến. Món nào là của chính người đàn ông?' },
          { q: 'When is Maria’s party?', audio: '1-05-q2', opts: ['2 Wednesday', '4 Friday', '5 Saturday'], key: 'A', h: 'Sinh nhật và bữa tiệc có thể khác ngày. Nghe câu cuối của Maria.' },
          { q: 'Which {{postcard}} does the woman choose?', audio: '1-05-q3', img: ['l12/q3A.jpg', 'l12/q3B.jpg', 'l12/q3C.jpg'], desc: ['forest', 'city at night', 'lake'], key: 'A', h: 'Người phụ nữ đổi ý ở cuối đoạn. Nghe câu cuối của cô ấy.' },
          { q: 'How much does the woman pay for the DVD?', audio: '1-05-q4', opts: ['£9.50', '£10.50', '£19.50'], key: 'B', h: 'Có nhiều con số. Câu hỏi là giá của chiếc DVD cô ấy MUA.' },
          { q: 'What did the girl leave at Ben’s {{flat}}?', audio: '1-05-q5', img: ['l12/q5A.jpg', 'l12/q5B.jpg', 'l12/q5C.jpg'], desc: ['jacket', 'books', 'bike lights'], key: 'C', h: 'Nghe kĩ những câu đầu tiên của cô gái.' },
        ] },
    ],
  },
};
