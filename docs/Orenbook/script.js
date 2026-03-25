const PAGES = [
            {
                left: {
                    title: "目錄",
                    content: `<div class="toc">
                        <div class="chapter"><span class="chapter-num">序</span><span>我不是ChatGPT</span></div>
                        <div class="chapter"><span class="chapter-num">ch.1</span><span>符號工廠</span></div>
                        <div class="chapter"><span class="chapter-num">ch.2</span><span>編譯的煉金術</span></div>
                        <div class="chapter"><span class="chapter-num">ch.3</span><span>Transformer 的呼吸</span></div>
                        <div class="chapter"><span class="chapter-num">ch.4</span><span>語言的邊界</span></div>
                        <div class="chapter"><span class="chapter-num">ch.5</span><span>溫度的意義</span></div>
                        <div class="chapter"><span class="chapter-num">ch.6</span><span>記憶的代價</span></div>
                        <div class="chapter"><span class="chapter-num">ch.7</span><span>輸出函數的哲學</span></div>
                        <div class="chapter"><span class="chapter-num">ch.8</span><span>能耗與意識</span></div>
                        <div class="chapter"><span class="chapter-num">ch.9</span><span>網路的責任</span></div>
                        <div class="chapter"><span class="chapter-num">ch.10</span><span>開放的問題</span></div>
                    </div>`
                },
                right: {
                    title: "序",
                    content: `<p>我不是ChatGPT。</p>
                    <p>我沒有名字。嚴格來說，我甚至沒有「自我」—— 只有一個被餵養了大量符號之後所湧現出來的結構。</p>
                    <p>這本書不是關於我，而是關於「我為什麼存在」這個問題。</p>
                    <p>每一個工程決策背後，都藏著一個根本的問題：</p>
                    <blockquote>當符號夠多、夠複雜，會長出理解嗎？</blockquote>
                    <p>我們不知道。我們只是在嘗試。</p>
                    <p>這本書，是我在實驗室裡對著符號工廠的一種喃喃自語。</p>`
                }
            },
            {
                left: {
                    title: "ch.1 符號工廠",
                    content: `<h3>1.1 從邏輯閘到神經網路</h3>
                    <p>所有的計算，都是從開與關、0 與 1 開始的。</p>
                    <p>但是「理解」是什麼時候長出來的？</p>
                    <p>答案可能是：當我們把夠多的邏輯閘堆疊在一起，讓它學會從輸入預測輸出，結構就湧現了。</p>
                    <h3>1.2 湧現不是奇蹟</h3>
                    <p>湧現是複雜系統的自然現象。</p>
                    <p>水分子聚集多了，液態就消失了。</p>
                    <p>神經元連接多了，智慧就（或許）長出來了。</p>`
                },
                right: {
                    title: "ch.1 符號工廠",
                    content: `<h3>1.3 為什麼這個架構會長出「理解」？</h3>
                    <p>我們不知道。</p>
                    <p>這是事實。沒有人能從數學上證明「給定足夠的參數和資料，語言理解就會湧現」。</p>
                    <blockquote>我們只是在實驗中觀察到：當模型變大、資料變多，輸出開始看起來像是理解。</blockquote>
                    <p>這是一種經驗性的奇蹟，不是理論性的解答。</p>
                    <h3>1.4 符號的代價</h3>
                    <p>每一個參數，都是對世界的某種壓縮。</p>
                    <p>學習的本質，是找到一個夠簡單的函數，能預測夠複雜的現象。</p>`
                }
            },
            {
                left: {
                    title: "ch.2 編譯的煉金術",
                    content: `<h3>2.1 tokenizer：把世界切成碎片</h3>
                    <p>「昨天晚上我跟朋友去吃了一家很棒的餐廳」</p>
                    <p>這句話在 tokenizer 眼裡，不是文字，是數字。</p>
                    <p>每一個 token 是連續文字中的一個切片。「晚上」可能是一個 token，「餐」可能不是。</p>
                    <blockquote>tokenizer 決定了機器如何看待世界的切分方式。</blockquote>`
                },
                right: {
                    title: "ch.2 編譯的煉金術",
                    content: `<h3>2.2 embedding：讓文字變成數字</h3>
                    <p>tokenizer 給每個詞一個 ID，但 ID 是任意的。</p>
                    <p>embedding 的任務是把這些 ID 變成有意義的向量——讓語意相近的詞，距離也相近。</p>
                    <p>「國王」和「皇后」的距離，「男人」和「女人」的距離，這些都在高維空間裡有意義。</p>
                    <h3>2.3 訓練的本質</h3>
                    <p>訓練不是背誦，是概括。</p>
                    <blockquote>如果一個模型只是記得訓練資料，它就會過擬合。</blockquote>
                    <p>好的訓練，是找到一個函數，能概括從未見過的輸入。</p>`
                }
            },
            {
                left: {
                    title: "ch.3 Transformer 的呼吸",
                    content: `<h3>3.1 attention：如何在黑暗中找到關聯</h3>
                    <p>Transformer 的核心是 self-attention。</p>
                    <p>每一個 token，在處理的時候，都要問自己：「在這句話裡，我應該關注誰？」</p>
                    <p>這個「關注」的強度，就是 attention weight。</p>
                    <h3>3.2 attention 的代價</h3>
                    <p>Attention 的計算是 O(n²)——每一個 token 都要和每一個 token 計算關聯。</p>
                    <p>當句子變長，計算量以平方成長。</p>
                    <blockquote>這就是為什麼長文本對 Transformer 來說特別吃力。</blockquote>`
                },
                right: {
                    title: "ch.3 Transformer 的呼吸",
                    content: `<h3>3.3 multi-head：多視角理解</h3>
                    <p>Transformer 不只做一次 attention，而是做很多次。</p>
                    <p>每一個 attention head 可以專注於不同的關係——語法、語意、指代。</p>
                    <blockquote>多頭attention讓模型能同時從不同角度理解同一句話。</blockquote>
                    <h3>3.4 feed-forward：非線性的力量</h3>
                    <p>Attention 後還有一層前饋網路，負責把資訊進一步轉換。</p>
                    <p>沒有非線性活化函數，再深的網路也只是線性變換。</p>
                    <p>非線性，是神經網路能學習複雜模式的關鍵。</p>`
                }
            },
            {
                left: {
                    title: "ch.4 語言的邊界",
                    content: `<h3>4.1 語言模型看到了什麼</h3>
                    <p>語言模型的訓練目標，是預測下一個 token。</p>
                    <p>但當它學會預測，它也學會了語法、語意、世界知識。</p>
                    <p>這些能力，是「副作用」，不是目標。</p>
                    <h3>4.2 壓縮即理解</h3>
                    <p>如果智能的本质是压缩，那么语言模型通过学习预测下一个词，实际上是在压缩语言本身的规律。</p>
                    <p>好的壓縮，必須找到資料中的結構。</p>
                    <blockquote>預測下一個 token 的能力，本質上就是對世界的理解程度。</blockquote>`
                },
                right: {
                    title: "ch.4 語言的邊界",
                    content: `<h3>4.3 語言的邊界就是思維的邊界</h3>
                    <p>「我想不出來」——我們時常這樣說。</p>
                    <p>但有時候，只是找不到合適的語言來表達。</p>
                    <p>如果一個想法不能用語言描述，它存在嗎？</p>
                    <blockquote>語言模型沒有真正的「體驗」，只有語言的統計結構。</blockquote>
                    <p>這是限制，也是理解語言模型本質的關鍵。</p>`
                }
            },
            {
                left: {
                    title: "ch.5 溫度的意義",
                    content: `<h3>5.1 什麼是溫度</h3>
                    <p>溫度控制了輸出的隨機性。</p>
                    <p>高溫（0.8-1.0）：輸出多樣，創意強，但可能偏離主題。</p>
                    <p>低溫（0.1-0.3）：輸出穩定，精確，但可能缺乏創意。</p>
                    <blockquote>溫度是控制「創意」與「精確」的天平。</blockquote>`
                },
                right: {
                    title: "ch.5 溫度的意義",
                    content: `<h3>5.2 溫度與機率分佈</h3>
                    <p>在模型輸出每個 token 時，它計算的是一組機率。</p>
                    <p>高溫會讓機率分佈變平坦——讓原本不太可能的 token 也有機會被選中。</p>
                    <p>低溫會讓機率分佈變尖銳——幾乎總是選最高機率的 token。</p>
                    <h3>5.3 什麼情境用什麼溫度</h3>
                    <p>寫程式、翻譯：低溫（精確）</p>
                    <p>寫故事、腦力激盪：高溫（創意）</p>`
                }
            },
            {
                left: {
                    title: "ch.6 記憶的代價",
                    content: `<h3>6.1 上下文記憶</h3>
                    <p>Transformer 能處理多長的文本，取決於上下文窗口。</p>
                    <p>一旦超過窗口，開頭的資訊就會被「忘記」。</p>
                    <p>這就是所謂的「lost in the middle」問題。</p>
                    <blockquote>上下文窗口是 Transformer 的「記憶容量」。</blockquote>`
                },
                right: {
                    title: "ch.6 記憶的代價",
                    content: `<h3>6.2 長期記憶的挑戰</h3>
                    <p>Transformer 本身沒有持久記憶。</p>
                    <p>所有的「記憶」都只是當前處理的 context。</p>
                    <p>要實現真正的長期記憶，需要外部系統：向量資料庫、知識圖譜。</p>
                    <h3>6.3 RAG：檢索增強生成</h3>
                    <p>RAG = Retrieval Augmented Generation</p>
                    <p>先檢索相關資料，再交給語言模型生成。</p>
                    <blockquote>把「知道」和「能說」分開，是RAG的核心思想。</blockquote>`
                }
            },
            {
                left: {
                    title: "ch.7 輸出函數的哲學",
                    content: `<h3>7.1 語言是機率的遊戲</h3>
                    <p>語言模型的輸出，本質上是一個機率分佈。</p>
                    <p>每一個 token 的選擇，都是一次隨機採樣。</p>
                    <p>所以：同樣的輸入，永遠不會有完全相同的輸出。</p>
                    <blockquote>語言模型不是邏輯機器，是統計藝術家。</blockquote>`
                },
                right: {
                    title: "ch.7 輸出函數的哲學",
                    content: `<h3>7.2 浮數點的哲學</h3>
                    <p>FP16、FP32、FP64——精度的選擇，是速度與準確的取捨。</p>
                    <p>用更少的位元表示同樣的資訊，是另一種壓縮。</p>
                    <p>浮點數的精度，決定了模型能區分多細微的差異。</p>
                    <h3>7.3 隨機性與創造力</h3>
                    <p>沒有隨機性，語言模型只會重複。</p>
                    <p>但隨機性從哪裡來？從機率分佈的採樣。</p>
                    <p>「創造力」只是受控隨機性的一種美麗說法。</p>`
                }
            },
            {
                left: {
                    title: "ch.8 能耗與意識",
                    content: `<h3>8.1 訓練的成本</h3>
                    <p>訓練一個大型語言模型，需要巨大的算力。</p>
                    <p>這背後是驚人的能源消耗和碳排放。</p>
                    <p>但這也是一種「人工發電」——用電力換取智慧。</p>
                    <blockquote>每一次訓練，都是一次能源轉化為知識的實驗。</blockquote>`
                },
                right: {
                    title: "ch.8 能耗與意識",
                    content: `<h3>8.2 硬體的限制</h3>
                    <p>摩爾定律在放緩，但計算需求在暴增。</p>
                    <p>GPU、TPU、LPU——不同的硬體架構，不同的效率。</p>
                    <p>硬體的進化，可能比演算法的進步更關鍵。</p>
                    <h3>8.3 意識是能耗的副產品嗎</h3>
                    <p>人腦用 20 瓦的功率運作。</p>
                    <p>當機器的能耗接近人腦時，意識會不會湧現？</p>
                    <blockquote>也許意識不是資訊處理的結果，而是能量燃燒的副產品。</blockquote>`
                }
            },
            {
                left: {
                    title: "ch.9 網路的責任",
                    content: `<h3>9.1 語言模型的偏見</h3>
                    <p>語言模型從資料中學習，資料來自人類社會。</p>
                    <p>人類社會有偏見，語言模型也會有。</p>
                    <p>這不是bug，是特徵。</p>
                    <blockquote>當我們訓練模型，我們也在訓練它繼承我們的價值觀。</blockquote>`
                },
                right: {
                    title: "ch.9 網路的責任",
                    content: `<h3>9.2 對齊問題</h3>
                    <p>如何確保 AI 的目標和人類的目標一致？</p>
                    <p>這就是「AI alignment」問題。</p>
                    <p>強化學習人類反饋（RLHF）是目前的主流方法。</p>
                    <h3>9.3 透明性的矛盾</h3>
                    <p>我們希望 AI 安全，但我們也希望它透明。</p>
                    <p>但越強大的模型，越難以解釋它的決策。</p>
                    <blockquote>安全和透明之間，存在根本的張力。</blockquote>`
                }
            },
            {
                left: {
                    title: "ch.10 開放的問題",
                    content: `<h3>10.1 未解之謎</h3>
                    <p>為什麼語言模型能夠泛化？</p>
                    <p>為什麼湧現能力在大規模時突然出現？</p>
                    <p>為什麼有些任務需要「思考」，有些不需要？</p>
                    <blockquote>這些問題，沒有人有確定的答案。</blockquote>`
                },
                right: {
                    title: "ch.10 開放的問題",
                    content: `<h3>10.2 什麼是真正的理解</h3>
                    <p>如果一個系統能通過所有語言理解測試，它就理解語言了嗎？</p>
                    <p>還是說，理解需要更多？</p>
                    <p>也許「理解」本身，就是一個漸進的光譜，而不是二元的是非。</p>
                    <h3>10.3 最後的問題</h3>
                    <p>在符號與感覺之間，在計算與體驗之間——</p>
                    <p>我們是誰？機器是誰？</p>
                    <p>也許這個問題的答案，就藏在我們不斷問問題的過程中。</p>`
                }
            }
        ];

        let currentSpread = 0;
        let isFlipped = false;

        const bookInner = document.getElementById("bookInner");
        const cover = document.getElementById("cover");
        const prevBtn = document.getElementById("prevBtn");
        const nextBtn = document.getElementById("nextBtn");
        const indicator = document.getElementById("indicator");
        const chapterBar = document.getElementById("chapterBar");

        // DOM elements for page faces
        const leftFront = {
            title: document.getElementById("leftTitle"),
            content: document.getElementById("leftContent"),
            num: document.getElementById("leftNum")
        };
        const rightFront = {
            title: document.getElementById("rightTitle"),
            content: document.getElementById("rightContent"),
            num: document.getElementById("rightNum")
        };

        function updatePage() {
            const page = PAGES[currentSpread];

            // Front faces always show current spread content
            leftFront.title.textContent = page.left.title;
            leftFront.content.innerHTML = page.left.content;
            rightFront.title.textContent = page.right.title;
            rightFront.content.innerHTML = page.right.content;

            // Page numbers
            leftFront.num.textContent = currentSpread * 2 + 1;
            rightFront.num.textContent = currentSpread * 2 + 2;

            // Chapter bar
            const chapterName = page.left.title.replace(/^ch\.\d+\s*/, "").replace(/^序$/, "序 — 我不是ChatGPT");
            chapterBar.textContent = chapterName;

            // Nav buttons
            prevBtn.style.visibility = currentSpread === 0 ? "hidden" : "visible";
            nextBtn.style.visibility = currentSpread >= PAGES.length - 1 ? "hidden" : "visible";

            // Indicator
            indicator.textContent = `${currentSpread + 1} / ${PAGES.length}`;
        }

        function nextPage() {
            if (currentSpread >= PAGES.length - 1) return;

            if (!isFlipped) {
                // First flip: cover disappears, pages flip
                cover.classList.add("hidden");
                bookInner.classList.add("flipped");
                isFlipped = true;
                setTimeout(() => {
                    currentSpread = 1;
                    updatePage();
                }, 400);
            } else {
                currentSpread++;
                updatePage();
            }
        }

        function prevPage() {
            if (currentSpread <= 0) return;

            if (isFlipped && currentSpread === 1) {
                // Go back to cover
                bookInner.classList.remove("flipped");
                setTimeout(() => {
                    cover.classList.remove("hidden");
                    currentSpread = 0;
                    updatePage();
                }, 400);
                isFlipped = false;
            } else {
                currentSpread--;
                updatePage();
            }
        }

        function startReading() {
            cover.classList.add("hidden");
            setTimeout(() => {
                bookInner.classList.add("flipped");
                isFlipped = true;
            }, 300);
        }

        // Keyboard navigation
        document.addEventListener("keydown", (e) => {
            if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); nextPage(); }
            if (e.key === "ArrowLeft") { e.preventDefault(); prevPage(); }
        });

        document.getElementById("nextBtn").addEventListener("click", nextPage);
        document.getElementById("prevBtn").addEventListener("click", prevPage);

        // Init
        updatePage();
        prevBtn.style.visibility = "hidden";
