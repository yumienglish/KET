/* =====================================================================
   KET Adventure – DỮ LIỆU BÀI HỌC
   ---------------------------------------------------------------------
   • OPEN_WEEK: tuần đang mở (tự tính từ OPEN_WEEK_SET + OPEN_DATES – xem "MỞ TUẦN" bên dưới). Mỗi tuần thêm 1 bài vào LESSONS.
     Các bài tuần trước vẫn mở để học sinh xem lại.
   • Chữ highlight (bấm xem nghĩa) viết trong {{từ}} hoặc {{khoá|chữ hiển thị}}; khoá phải có trong VOCAB.
   • newWords = danh sách "New words" đầu bài (để chép vở): chỉ từ A2 trở lên / liên quan ngữ pháp,
     A1 chỉ lấy khi ít gặp. Từ nằm trong câu hỏi, đề bài KHÔNG đưa vào (vẫn highlight được).
   • ai: tên hình minh hoạ ChatGPT img/ai/<tên>.jpg (chưa có thì tự ẩn) · cheer: câu linh vật nói (mặc định theo dạng bài)
   • Đáp án nhiều cách viết đúng thì ngăn bằng dấu |   (show = đáp án hiện cho HS xem)
   ===================================================================== */
/* ---- MỞ TUẦN ----
   OPEN_WEEK_SET = tuần mở tay (như trước đây). OPEN_DATES = ngày TỰ MỞ từng tuần (0h giờ Việt Nam), VD { 3: '2026-12-01', 4: '2026-12-08' }:
   đến ngày đó tuần tự mở, không cần sửa số. Chỉ tự mở khi tuần đó đã có bài. Tuần chưa mở vẫn xem trước được bằng ?preview. */
const OPEN_WEEK_SET = 3;
const OPEN_DATES = {};

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

  /* 2.1 For sale + 2.2 Shopping from home */
  'bookshop':       { w: 'bookshop', ipa: '/ˈbʊkʃɒp/', vi: 'hiệu sách' },
  'chemist':        { w: 'chemist', ipa: '/ˈkemɪst/', vi: 'hiệu thuốc (bán cả dầu gội, xà phòng…)' },
  'department store': { w: 'department store', ipa: '/dɪˈpɑːtmənt stɔː/', vi: 'cửa hàng bách hoá (bán đủ thứ)' },
  'market':         { w: 'market', ipa: '/ˈmɑːkɪt/', vi: 'chợ' },
  'sports shop':    { w: 'sports shop', ipa: '/ˈspɔːts ʃɒp/', vi: 'cửa hàng đồ thể thao' },
  'catalogue':      { w: 'catalogue', ipa: '/ˈkætəlɒɡ/', vi: 'cuốn danh mục hàng (xem hình rồi đặt mua)' },
  'price list':     { w: 'price list', ipa: '/ˈpraɪs lɪst/', vi: 'bảng giá' },
  'size':           { w: 'size', ipa: '/saɪz/', vi: 'cỡ, kích cỡ (S, M, L…)' },
  'in the sale':    { w: 'in the sale', ipa: '/ɪn ðə seɪl/', vi: 'đang được giảm giá' },
  'leather':        { w: 'leather', ipa: '/ˈleðə/', vi: 'da (thuộc) – VD: giày da' },
  'customers':      { w: 'customers', ipa: '/ˈkʌstəməz/', vi: 'khách hàng' },
  'luggage':        { w: 'luggage', ipa: '/ˈlʌɡɪdʒ/', vi: 'hành lý' },
  'suitcases':      { w: 'suitcases', ipa: '/ˈsuːtkeɪsɪz/', vi: 'va li' },
  'competition':    { w: 'competition', ipa: '/ˌkɒmpəˈtɪʃən/', vi: 'cuộc thi' },
  'prize':          { w: 'prize', ipa: '/praɪz/', vi: 'giải thưởng' },
  'usual':          { w: 'usual', ipa: '/ˈjuːʒuəl/', vi: 'như thường lệ, như mọi khi' },
  'machine':        { w: 'machine', ipa: '/məˈʃiːn/', vi: 'cái máy' },
  'journey':        { w: 'journey', ipa: '/ˈdʒɜːni/', vi: 'chuyến đi' },
  'necessary':      { w: 'necessary', ipa: '/ˈnesəsəri/', vi: 'cần thiết' },
  'interested':     { w: 'interested', ipa: '/ˈɪntrəstɪd/', vi: 'quan tâm, thích' },
  'shampoo':        { w: 'shampoo', ipa: '/ʃæmˈpuː/', vi: 'dầu gội đầu' },
  'spend':          { w: 'spend', ipa: '/spend/', vi: 'tiêu (tiền); dành (thời gian)' },
  'pairs':          { w: 'pairs', ipa: '/peəz/', vi: 'đôi (giày, tất…)' },
  'singular':       { w: 'singular', ipa: '/ˈsɪŋɡjələ/', vi: 'số ít (1 cái)' },
  'plural':         { w: 'plural', ipa: '/ˈplʊərəl/', vi: 'số nhiều (2 cái trở lên)' },
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

  /* ===================== TUẦN 3 – 2.1 For sale + 2.2 Shopping from home ===================== */
  3: {
    code: '2.1–2.2', title: 'Shopping', unit: 'Unit 2 · Shopping',
    newWords: ['bookshop', 'chemist', 'department store', 'market', 'sports shop', 'catalogue', 'price list', 'size', 'in the sale', 'leather', 'customers', 'luggage', 'competition', 'prize'],
    // Ví dụ trong ô Grammar KHÔNG trùng danh từ trong bài tập
    grammar: `
      <h4>1. How much / How many</h4>
      <ul>
        <li><b>How many</b> + danh từ <b>đếm được</b> (số nhiều): <i>How <b>many</b> apples have you got?</i></li>
        <li><b>How much</b> + danh từ <b>không đếm được</b>: <i>How <b>much</b> water do you drink?</i></li>
        <li>Hỏi giá: <b>How much is / are …?</b> <i>How much <b>is</b> this hat?</i></li>
      </ul>
      <h4>2. some / any</h4>
      <ul>
        <li><b>some</b>: câu khẳng định, lời mời, nhờ, rủ. <i>I’ve got <b>some</b> pens. · Can I have <b>some</b> juice?</i></li>
        <li><b>any</b>: câu phủ định và câu hỏi. <i>I haven’t got <b>any</b> pens. · Is there <b>any</b> milk?</i></li>
      </ul>
      <h4>3. Số nhiều</h4>
      <ul>
        <li>Thường thêm <b>-s</b>: <i>cat → cats</i></li>
        <li>Tận cùng <b>-s, -ss, -sh, -ch, -x</b> → thêm <b>-es</b>: <i>dish → dishes, watch → watches</i></li>
        <li>Phụ âm + <b>o</b> → <b>-es</b>: <i>hero → heroes</i> · Phụ âm + <b>y</b> → <b>-ies</b>: <i>story → stories</i> (nhưng <i>toy → toys</i>)</li>
        <li>Bất quy tắc: <i>child → children, foot → feet</i> · Không đếm được: chỉ có 1 dạng (<i>milk, juice</i>)</li>
      </ul>`,
    ex: [
      /* Mission 1 – 2.1 Ex 1: nối nhóm đồ vật với tên cửa hàng */
      { id: '1', type: 'pick', noLetter: true, cheer: 'Where do you go to buy these? 🛍️',
        title: 'Vocabulary: shops',
        how: 'Where can you buy these things? Match each group of things to a shop.',
        opts: ['bookshop', 'chemist', 'department store', 'market', 'sports shop'],
        items: [
          { pic: 'w3/s1.jpg', key: 'D', h: 'Đồ ăn tươi: cá, rau, hoa quả, phô mai.' },
          { pic: 'w3/s2.jpg', key: 'A', h: 'Sách, bản đồ, thiệp, tạp chí.' },
          { pic: 'w3/s3.jpg', key: 'B', h: 'Thuốc ho, dầu gội, xà phòng.' },
          { pic: 'w3/s4.jpg', key: 'C', h: 'Ví, thắt lưng, áo len, máy ảnh, ô… rất nhiều loại đồ khác nhau.' },
          { pic: 'w3/s5.jpg', key: 'E', h: 'Bóng, vợt, giày chạy.' },
        ] },

      /* Mission 2 – 2.1 Ex 3 (cô đổi): chạm chọn much / many, hỏi – đáp tự soạn */
      { id: '3', type: 'choose', ai: 'k3-howmuch',
        title: 'Grammar: How much? How many?',
        how: 'Choose <b>much</b> or <b>many</b>. Read the answer too – it can help you!',
        choices: ['much', 'many'],
        example: { t: 'How [[much]] chocolate do you eat?', a: 'Not much – maybe one bar a week.' },
        items: [
          { t: 'How [[many]] T-shirts have you got?', a: 'About twenty. I love T-shirts!', h: 'T-shirts có -s → đếm được hay không đếm được?' },
          { t: 'How [[much]] money do you {{spend}} on sweets?', a: 'Not much. About £2 a week.', h: 'Không ai nói “two moneys” → money đếm được không?' },
          { t: 'How [[many]] DVDs did you buy last month?', a: 'Three. They were all cartoons!', h: 'Đếm được: one DVD, two DVDs…' },
          { t: 'How [[much]] {{shampoo}} do you use?', a: 'A lot! I’ve got very long hair.', h: 'Dầu gội là chất lỏng → không đếm từng cái được.' },
          { t: 'How [[many]] people are there in your family?', a: 'Four: Mum, Dad, my brother and me.', h: 'people là số nhiều của person (one person, two people).' },
          { t: 'How [[much]] time do you spend on your phone?', a: 'About two hours a day.', h: 'time (thời gian) không đếm được.' },
          { t: 'How [[many]] {{pairs}} of shoes are there in your room?', a: 'Five pairs – two of them are trainers.', h: 'one pair, two pairs… → đếm được.' },
          { t: 'How [[much]] is this bag?', a: 'It’s £15.', h: 'Câu này hỏi GIÁ của cái túi. Xem mục 1 trong ô Grammar.' },
        ] },

      /* Mission 3 – 2.1 Ex 7: đọc 8 mẩu chữ A–H, chọn mẩu nói ý 1–5 */
      { id: '7', type: 'pick', letters: 8, cheer: 'Read carefully – look for words with the same meaning! 👀',
        title: 'Reading: what does it say?',
        how: 'Look at texts A–H. Which text (A–H) says this (1–5)?',
        gallery: [
          { L: 'A', img: 'w3/rA.jpg' }, { L: 'B', img: 'w3/rB.jpg' }, { L: 'C', img: 'w3/rC.jpg' }, { L: 'D', img: 'w3/rD.jpg' },
          { L: 'E', img: 'w3/rE.jpg' }, { L: 'F', img: 'w3/rF.jpg' }, { L: 'G', img: 'w3/rG.jpg' }, { L: 'H', img: 'w3/rH.jpg' },
        ],
        items: [
          { q: 'Things are cheaper than {{usual}} today.', key: 'G', h: 'Rẻ hơn mọi ngày → tìm chữ nói về giảm giá.' },
          { q: 'You get a drink with this meal.', key: 'D', h: 'Tìm một đồ uống trong các mẩu chữ.' },
          { q: 'Call the number if you are {{interested}} in any of these.', key: 'H', h: 'Call = gọi điện → mẩu chữ nào có số điện thoại?' },
          { q: 'It costs nothing to leave your car if you are shopping here.', key: 'B', h: 'costs nothing = free (miễn phí). leave your car = đỗ xe.' },
          { q: 'Do not put this in a {{machine}}.', key: 'A', h: 'machine ở đây là máy giặt. Mẩu chữ nào nói về cách giặt?' },
        ] },

      /* Mission 4 – 2.2 Ex 3: nghe hội thoại, điền 5 con số (bỏ câu hỏi ý chính – cô chọn) */
      { id: '2', type: 'fill', track: '1-07', ai: 'k3-phone', cheer: 'Numbers, numbers! Listen carefully. 🔢',
        title: 'Listening: ordering on the phone',
        how: 'Sally is ordering things from a sportswear {{catalogue}}. Listen and write the missing numbers.',
        items: [
          { pre: [['Kevin', 'Good morning. Sportswear, Kevin speaking. How can I help you?'],
                  ['Sally', 'Hi. I’ve got your {{catalogue}} here, but I can’t find the {{price list}}. Can you give me some prices?'],
                  ['Kevin', 'Of course. Please tell me the page number you’re looking at.']],
            who: 'Sally', t: 'OK. The first thing is on page [[14|fourteen]] and it’s the football shirt, the blue and red one.', h: 'Số trang của chiếc áo bóng đá – nghe Sally nói “page …”.' },
          { who: 'Kevin', t: 'OK. The small and medium {{size|sizes}} are £22.65 and large and extra large are £ [[26.40|26.4|twenty six forty]].', h: 'Có 2 giá: £22.65 là cỡ nhỏ và vừa. Em cần giá cỡ lớn.' },
          { pre: [['Sally', 'Right. I’d like to order one, please, size small.'],
                  ['Kevin', 'Fine. Have you got any more things to order?']],
            who: 'Sally', t: 'Yes, I’d like some trainers. They’re on page [[57|fifty seven]]. How much are the black and purple ones at the top of the page?', h: 'Số trang của đôi giày – nghe kĩ cả hai chữ số.' },
          { who: 'Kevin', t: 'Well, they were £49.50 but they’re {{in the sale}} now, so they’re only £ [[18.95|eighteen ninety five]]. But we don’t have any left in small sizes. What shoe size are you?', h: '£49.50 là giá cũ. Giá bây giờ (in the sale) là bao nhiêu?' },
          { who: 'Sally', t: 'I’m a [[38|thirty eight]].', h: 'Cỡ giày của Sally.' },
        ],
        after: [['Kevin', 'Let me check. Wow, you’re lucky! We’ve got one pair in that size.'],
                ['Sally', 'Great. Well, that’s all I need. My name and address is …']] },

      /* Mission 5 – 2.2 Ex 5: some / any (chạm chọn) */
      { id: '5', type: 'choose', ai: 'k3-someany', cheer: 'Positive, negative or a question? 🤔',
        title: 'Grammar: some or any?',
        how: 'Complete the sentences with <b>some</b> or <b>any</b>.',
        choices: ['some', 'any'],
        example: { t: 'I can’t find [[any]] sunglasses I like here.' },
        items: [
          { t: 'There are [[some]] nice jackets in the shops at the moment.', h: 'Đây là câu khẳng định.' },
          { t: 'Are there [[any]] yellow surfing T-shirts in the sale?', h: 'Đây là câu hỏi.' },
          { t: 'I want to buy [[some]] trainers, please.', h: 'Câu khẳng định (em muốn mua).' },
          { t: 'Mum, can you lend me [[some]] money?', h: 'Câu hỏi nhưng thật ra là lời NHỜ. Xem mục 2 trong ô Grammar.' },
          { t: 'Let’s get [[some]] sandwiches.', h: 'Let’s… là lời rủ, câu khẳng định.' },
          { t: 'Has that website got [[any]] special prices?', h: 'Câu hỏi bình thường (hỏi thông tin).' },
          { t: 'Why don’t we buy [[some]] new DVDs?', h: '“Why don’t we…?” là lời RỦ, không phải câu hỏi thật.' },
          { t: 'There isn’t [[any]] bread left – can you get [[some]] in town?', h: 'Vế 1 là câu phủ định, vế 2 là lời nhờ.' },
        ] },

      /* Mission 6 – 2.2 Activity: Picture puzzle (số ít + số nhiều, chữ cái cuối → câu bí mật) */
      { id: 'A', type: 'plural',
        title: 'Picture puzzle',
        how: 'Write the {{singular}} and {{plural}} forms of the word for each picture.',
        example: { img: 'w3/a1.jpg', s: 'map', p: 'maps' },
        items: [
          { img: 'w3/a2.jpg', s: 'camera', p: 'cameras', h: 'Chỉ cần thêm -s.' },
          { img: 'w3/a3.jpg', s: 'bus', p: 'buses', h: 'Tận cùng -s → thêm -es.' },
          { img: 'w3/a4.jpg', s: 'dress', p: 'dresses', h: 'Tận cùng -ss → thêm -es.' },
          { img: 'w3/a5.jpg', s: 'book', p: 'books', h: 'Chỉ cần thêm -s.' },
          { img: 'w3/a6.jpg', s: 'bicycle|bike', p: 'bicycles|bikes', h: 'Chỉ cần thêm -s.' },
          { img: 'w3/a7.jpg', s: 'fly', p: 'flies', h: 'Phụ âm + y → bỏ y, thêm -ies.' },
          { img: 'w3/a8.jpg', s: 'rice', p: 'rice', h: 'Gạo không đếm được → chỉ có 1 dạng, không thêm -s.' },
          { img: 'w3/a9.jpg', s: 'box', p: 'boxes', h: 'Tận cùng -x → thêm -es.' },
          { img: 'w3/a10.jpg', s: 'banana', p: 'bananas', h: 'Chỉ cần thêm -s.' },
          { img: 'w3/a11.jpg', s: 'arm', p: 'arms', h: 'Chỉ cần thêm -s.' },
          { img: 'w3/a12.jpg', s: 'glass', p: 'glasses', h: 'Tận cùng -ss → thêm -es.' },
          { img: 'w3/a13.jpg', s: 'tomato', p: 'tomatoes', h: 'Phụ âm + o → thêm -es.' },
          { img: 'w3/a14.jpg', s: 'potato', p: 'potatoes', h: 'Phụ âm + o → thêm -es.' },
          { img: 'w3/a15.jpg', s: 'lion', p: 'lions', h: 'Chỉ cần thêm -s.' },
        ],
        // ô chữ: chữ cái CUỐI của từ số ít, nhóm 4 – 3 – 4 – 4
        puzzle: { how: 'The last letter of each singular word goes in the boxes. They make four words. What do the words say?', groups: [4, 3, 4, 4], key: 'pass key exam soon', show: 'PASS KEY EXAM SOON' } },

      /* Mission 7 – Exam folder 2: Reading Part 1 (biển báo gõ lại cho rõ) */
      { id: 'R', type: 'pick', letters: 8, cross: 'D', cheer: 'Exam time! Cross out the example letter first. ✍️',
        title: 'Reading Part 1: notices',
        how: 'Which notice (A–H) says this (1–5)?',
        gallery: [
          { L: 'A', html: 'Buy train tickets at machine<br>when office is closed', cls: 'nt-box' },
          { L: 'B', html: '<b>FOR SALE</b><br>Boy’s bike, only 2 months old<br>Half usual price', cls: 'nt-left' },
          { L: 'C', html: 'TICKETS FOR TONIGHT’S<br>CONCERT ARE ON SALE HERE<br><small>FROM 7 PM</small>', cls: 'nt-grey' },
          { L: 'D', html: 'PLEASE PUT ALL {{luggage|LUGGAGE}}<br>ABOVE YOUR SEAT', cls: 'nt-box' },
          { L: 'E', html: '<b>SALE ENDS NEXT TUESDAY –<br>15% OFF EVERYTHING UNTIL THEN</b>', cls: 'nt-dark' },
          { L: 'F', html: 'UNDER 16s GOLF {{competition|COMPETITION}}<br><b>FIRST {{prize|PRIZE}} £30!</b>', cls: 'nt-box' },
          { L: 'G', html: 'SPEND £50 AND GET A<br><b class="big">FREE</b> SPORTS BAG', cls: 'nt-round' },
          { L: 'H', html: 'POOL OPENING HOURS NOW LONGER:<br>7 am – 10 pm (was 8.45 pm)', cls: 'nt-grey2' },
        ],
        example: { q: 'Do not leave any {{suitcases}} on the floor.', key: 'D' },
        items: [
          { q: 'It is possible to swim later in the evening now.', key: 'H', h: 'swim → tìm nơi bơi. later → giờ mở cửa thay đổi thế nào?' },
          { q: 'This is cheaper because it isn’t new.', key: 'B', h: 'isn’t new → đồ đã dùng rồi.' },
          { q: 'All our prices are lower for a short time.', key: 'E', h: 'All our prices = mọi món. for a short time = chỉ đến một ngày nào đó thôi.' },
          { q: 'You can pay for your {{journey}} in a different way if {{necessary}}.', key: 'A', h: 'journey = chuyến đi (tàu, xe). Nếu quầy bán vé đóng cửa thì sao?' },
          { q: 'If you are 15 or younger, you may win some money.', key: 'F', h: '15 or younger → tìm biển có giới hạn tuổi.' },
        ] },
    ],
  },
};

// Tuần đang mở = số lớn nhất giữa OPEN_WEEK_SET và các mục OPEN_DATES đã tới ngày (giờ VN) + đã có bài
const OPEN_WEEK = Object.keys(OPEN_DATES).reduce((w, k) => (+k > w && LESSONS[k] && Date.parse(OPEN_DATES[k] + 'T00:00:00+07:00') <= Date.now() ? +k : w), OPEN_WEEK_SET);
