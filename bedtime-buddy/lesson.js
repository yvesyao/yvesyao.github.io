// Original story. Sources and the limits of this family routine: SOURCES.md.
export const outfits=[
 {name:'月亮黄',shirt:0xffcf54,pants:0x80a8ad,shoe:0xe8ae8a},
 {name:'桃子粉',shirt:0xf0a299,pants:0xc0a8b7,shoe:0xecc78e},
 {name:'小叶绿',shirt:0x99b89b,pants:0xd6b493,shoe:0xe6ac8c}
];
export const lesson=[
 {label:'和妈妈约好',title:'妈妈，我们慢慢试',say:'妈妈，我们试试新的晚安。',hint:'吃奶可以早一点，抱抱一直都在。',parent:'这一课专门讲调整睡前这次母乳亲喂。亲喂后还会刷牙时，不据此认定为奶睡。先在原流程后增加固定抱抱、读书；适应后，若家庭希望减少这次亲喂，可逐步把它提前，再慢慢缩短或减少。动画的完整顺序是过渡目标，不是第一晚的要求，也不要求同时断白天母乳或夜奶。',duration:9},
 {label:'暖暖洗个澡',title:'洗个澡，香香的',say:'妈妈陪我，洗个暖暖的澡。',hint:'熟悉的小步骤，还是一样的。',parent:'保留原来的洗澡顺序，降低一次改变太多带来的不适。成人全程在孩子伸手可及处照看；动画用玩偶和围巾式浴巾保持遮挡，不作真实洗澡操作教学。',duration:7},
 {label:'换好小尿布',title:'换好干净的小尿布',say:'换干净，舒服啦。',hint:'大人帮帮忙，小肚肚也盖好。',parent:'夜间尿布与睡前奶是两件事，不必一起撤掉。此处通过干净尿布道具和成人协助表达换好尿布，不示范独自操作或暴露身体。',duration:7},
 {label:'抹抹身体乳',title:'小胳膊，轻轻抹',say:'抹一抹，轻轻的。',hint:'不赶时间，慢慢做。',parent:'沿用家里已在使用的保湿护理，由成人帮助。这里是熟悉流程的一部分，不是新增护肤产品或治疗建议。',duration:7},
 {label:'穿上小睡衣',title:'小睡衣，穿好啦',say:'我喜欢这套小睡衣。',hint:'选个喜欢的颜色，准备好啦。',parent:'给两个都可接受的小选择，例如哪套睡衣、哪本书；不要把“今晚到底要不要戒奶”反复交给孩子决定。大人温和地承担安排，允许孩子表达不喜欢。',duration:7},
 {label:'刷刷小牙齿',title:'喝完、吃完，再刷牙',say:'大人帮我，牙齿刷干净。',hint:'这个短动作是示意，刷牙请大人帮忙。',parent:'两岁孩子由成人帮助，每天用少量含氟牙膏刷牙两次；三岁以下用米粒大小。动画几秒并非实际刷牙时长。睡前饮食后刷牙，把计划中的睡前亲喂安排在刷牙之前；口渴可喝少量白水。若又亲喂了，重新做好牙齿清洁，不责备孩子。',duration:9},
 {label:'我还想吃奶',title:'想吃奶，也可以说',say:'我还想吃妈妈的奶……抱抱我，好吗？',hint:'“我知道，你很想吃奶。妈妈在这里。”',parent:'先判断是真饿、口渴、不舒服，还是需要安慰；不要把所有哭闹都当作习惯。若真饿了可以补充合适食物，再清洁牙齿。不羞辱、不吓唬，也不说奶坏了或妈妈不爱了。这段用在家庭已逐渐减少这次亲喂的阶段；不要求第一晚直接拒绝，也不要求孩子马上平静。',duration:10},
 {label:'抱抱在这里',title:'抱抱，一直都在',say:'你抱着我，我安心一点了。',hint:'想哭也可以，大人会陪着。',parent:'在已商量好的过渡步骤里，妈妈以拥抱、轻声说话或熟悉的小歌回应；其他照顾者也可以协助陪伴。照顾者尽量使用相同的简短说法，不把哭着独处作为故事的教学方法。持续明显难受或适逢生病、搬家时，放慢节奏或暂缓调整。',duration:11},
 {label:'读一本小书',title:'再读一本小小的书',say:'靠在一起，读一本书。',hint:'真正睡前，换成纸质绘本。',parent:'选择一两本熟悉的纸质书，保持可预期的结束方式。动画适合白天与成人共看、排练；睡前一小时关掉屏幕，不循环播放动画哄睡。',duration:10},
 {label:'布丁也晚安',title:'晚安，我有人陪',say:'晚安，布丁。晚安，我爱你。',hint:'不用今晚就学会，我们慢慢来。',parent:'关灯、晚安，用同一句话结束流程。成人仍可陪伴；这一课不要求独立入睡，也不承诺几天完成。夜醒、夜奶是否调整另作评估。若进食饮水明显下降、生长或吞咽有困难，请先与儿科医生讨论。',duration:10}
];
export const sourcesMarkup=`<h3>这课参考了什么</h3><ul>
<li><a href="https://www.who.int/tools/elena/interventions/continued-breastfeeding" target="_blank" rel="noopener">WHO · Continued breastfeeding</a>：母乳可持续到两岁或更久。</li>
<li><a href="https://www.nhs.uk/baby/breastfeeding-and-bottle-feeding/breastfeeding/how-to-stop/" target="_blank" rel="noopener">NHS · How to stop breastfeeding</a>：根据母婴意愿、一次调整一顿，逐渐减少。</li>
<li><a href="https://www2.hse.ie/babies-children/breastfeeding/stopping-breastfeeding/" target="_blank" rel="noopener">HSE · Stopping breastfeeding</a>：提前解释变化、建立歌曲或故事仪式、增加拥抱，困难时放慢。</li>
<li><a href="https://www.healthychildren.org/English/healthy-living/oral-health/Pages/Brush-Book-Bed.aspx" target="_blank" rel="noopener">AAP · Brush, Book, Bed</a>：刷牙、读书、规律就寝；三岁以下含氟牙膏用量。</li>
<li><a href="https://www.healthychildren.org/English/healthy-living/sleep/Pages/Healthy-Sleep-Habits-How-Many-Hours-Does-Your-Child-Need.aspx" target="_blank" rel="noopener">AAP · Healthy Sleep Habits</a>：规律习惯与睡前一小时关闭屏幕。</li></ul><p>核对日期：2026-10-30。对白、角色与流程为原创改编，机构未审核或背书。“把亲喂提前，再慢慢减少”是可选的家庭过渡安排，不是两岁孩子必须遵循的断奶处方。</p>`;
export const guideMarkup=`<h2>少一次亲喂，也有满满的陪伴。</h2>
<p>这课面向母乳亲喂家庭，重点是睡前这一次。亲喂后还会刷牙，不等于一定靠吃奶入睡；先看家庭想改变的是什么。</p>
<div class="dialog-note"><b>两岁，不是必须断母乳的截止日。</b><p>WHO 支持在合适辅食基础上，母乳持续到两岁或更久。如果妈妈或孩子准备调整，可以逐步减少；如果双方愿意继续，也不需要因为生日而强行停掉。</p></div>
<h3>保留你们的六步，一次小改一点</h3>
<ol><li><b>先让新安慰稳定下来：</b>洗澡 → 换尿布 → 身体乳 → 睡衣 → 亲喂 → 刷牙，先保持原顺序；在后面加抱抱、纸质绘本和固定晚安。</li>
<li><b>再把这次亲喂逐渐提前：</b>白天先告诉孩子，准备好后尝试在洗澡前亲喂，再照旧完成护理、刷牙、抱抱和读书。也可以分更小的步子挪动，不必一晚改完。</li>
<li><b>最后再决定是否减少或取消：</b>适应新的安慰后，可以逐渐缩短或减少睡前这次亲喂；观察孩子的吃喝与情绪，也给妈妈的身体时间适应。不同时要求撤掉白天母乳和夜奶。</li></ol>
<p><b>动画展示的是逐渐走向的顺序。</b>刚开始可以只练习“刷牙后的抱抱、读书、晚安”，不需要看完一遍就撤掉亲喂，也没有统一完成天数。</p>
<h3>孩子说“我想吃妈妈的奶”时</h3>
<p>先看看是否真饿、口渴或不舒服。若是在已决定减少这顿的阶段，可以说：“我知道，你很想吃奶。妈妈在这里。我们抱抱，还是一起看这本书？”可以哭、可以想念，妈妈继续回应。</p>
<p>不说“你大了不能吃”“妈妈的奶坏了”，不以离开或不爱了威胁。照顾者保持一致、温和的说法；另一位熟悉的大人也可以参与读书和安抚。</p>
<h3>也照顾妈妈的身体</h3>
<p>逐渐减少比骤停更容易适应，避免突然长时间不排乳。明显胀痛、局部红热或发热时，寻求医生或哺乳专业人员帮助。不自行用药或涂刺激物来让孩子拒绝。</p>
<h3>哪些时候先慢下来</h3>
<p>生病或生活变化大时不急着推进。孩子吃喝明显下降、存在生长或吞咽问题时先找儿科医生；一直非常难受时可以退回更小一步。保证合适的全天饮食与奶类营养；这课不直接规定总奶量、替代奶或夜醒处理。</p>
<div class="dialog-note"><b>白天看动画，睡前回到生活</b><p>白天一起看、用玩偶排练；睡前一小时关屏幕，使用纸质书和下方可打印的晚安卡。刷牙由成人帮助，三岁以下用米粒大小含氟牙膏。</p></div>${sourcesMarkup}`;
