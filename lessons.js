/* =====================================================================
   KET Adventure – DỮ LIỆU BÀI HỌC
   ---------------------------------------------------------------------
   • OPEN_WEEK: tuần đang mở. Mỗi tuần thêm 1 bài vào LESSONS rồi tăng số này.
     Các bài tuần trước vẫn mở để học sinh xem lại.
   • Chữ highlight (bấm xem nghĩa) viết trong {{từ}} hoặc {{khoá|chữ hiển thị}}; khoá phải có trong VOCAB.
   • newWords = danh sách "New words" đầu bài (để chép vở): chỉ từ A2 trở lên / liên quan ngữ pháp,
     A1 chỉ lấy khi ít gặp. Từ nằm trong câu hỏi, đề bài KHÔNG đưa vào (vẫn highlight được).
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
};

/* ---------- BÀI HỌC THEO TUẦN ---------- */
const LESSONS = {
  1: {
    code: '1.1', title: 'Friends for ever', unit: 'Unit 1 · Friends',
    newWords: ['be there for you', 'alone', 'text messages', 'tell lies', 'forget', 'chat', 'for hours', 'fridge', 'without', 'laugh', 'special'],
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
          10: 'They help you with your homework.',
          11: '{{party|Parties}} {{without}} your friends aren’t good!',
          12: 'Friends make you {{laugh}}.',
        } },

      /* Exercise 2 – nghe đánh vần (sách: Ex 3) */
      { id: '3', type: 'spell', track: '1-02',
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
      { id: '4', type: 'info', track: '1-03',
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
      { id: '5', type: 'speak',
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
};
