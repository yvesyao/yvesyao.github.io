window.$ && $(function(){
	$('a[href="#"]').click(function(event){
		event.preventDefault();
	});
	$('[data-modal]').click(function(e){
		e.preventDefault();
		$(this).attr('data-modal').modal('show');
	});
});
function dhDiv(ee1){
    //导航距离屏幕顶部距离 
    var _defautlTop = $(ee1).offset().top; 
    //鼠标滚动事件 
    $(window).scroll(function(){
        //导航距离屏幕左侧距离 
        var _defautlLeft = $(ee1).offset().left - $(window).scrollLeft(); 
        //导航默认样式记录，还原初始样式时候需要 
        var _left = $(ee1).css('left');
        var _width = $(ee1).outerWidth();
        if($(this).scrollTop() > _defautlTop){ 
            $(ee1).css({'left':_defautlLeft, 'width': _width}).addClass('topFixed'); 
        }else{ 
            $(ee1).css({'left':_left, 'width': 'auto'}).removeClass('topFixed'); 
        } 
    }); 
}