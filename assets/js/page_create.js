$(function(){
	var id;
	var step_1_completed = false, step_2_completed = false;
	$('#question_form').validate();
	$('input,select[title]').tooltip();
	$('#status .alert .close').click(function(){
		$('#status .alert').hide(500);
	});
	$('#proceed_2').click(function(e){
		e.preventDefault();
		$('#status .alert .message').text("Please Wait...");
		$('#status .alert').show(500);
		$('#question_sets').slideUp(500);
		
		$('#basic_info').ajaxSubmit({
			dataType:'json',
			success:function(response){
				if(response.success){
					id = response.id;
					$('.p_id').val(response.id);
					step_1_completed = true;
				}
				else {
					$('#status .alert .message').text(response.message);
					$('#status .alert').show(500);
				}
				
				if(step_1_completed){
					if($('#question_form').valid()){
						$('#question_form').ajaxSubmit({
							dataType:'json',
							beforeSend:function(){
								$('#ques_dialog .modal-body div:first').slideUp(500);
								$('#ques_dialog .modal-body div:last').slideDown(500);
							},
							success:function(response){
								if(response.success){
									step_2_completed = true;
									window.location.href = "/question/"+id+'?created=1';
								}
								else {
									$('#status .alert .message').text(response.message);
									$('#status .alert').show(500);
								}
							}
						});
					}
					else {
						$('#status .alert .message').text('Please set the questions properly.');
						$('#status .alert').show(500);
					}
				}
				else {
					$('#status .alert .message').text('Please complete step 1 first.');
					$('#status .alert').show(500);
				}
			}
		});
	});
	
	$('#add').click(function(){
		$('.question:last')
			.clone()
			.find("input[name='questions[name]']")
			.val('')
			.end()
			.appendTo('#question_sets')
			.find('.tagsinput')
			.remove();
		
		$('.tags:last').val('').tagsInput();
		$('.p_id').val(id);
		$('#question_form').validate();
	});
	
	$('.tags:first,#basic_info input[name=keywords]').tagsInput();
	
	$('html,body').animate({
		scrollTop: $('#msform').offset().top - 20
	},2000);
	
	var current_fs, next_fs, previous_fs;
	var left, opacity, scale;
	var animating;
	
	$(".next").click(function(){
		if(animating) return false;
		animating = true;
		current_fs = $(this).parent().parent();
		next_fs = $(this).parent().parent().next();
		$("#progressbar li").eq($("fieldset").index(next_fs)).addClass("active");
		next_fs.show(); 
		current_fs.animate({opacity: 0}, {
			step: function(now, mx) {
				scale = 1 - (1 - now) * 0.2;
				left = (now * 50)+"%";
				opacity = 1 - now;
				current_fs.css({
					'transform': 'scale('+scale+')',
					'-webkit-transform': 'scale('+scale+')',
					'-moz-transform': 'scale('+scale+')',
					'-ms-transform': 'scale('+scale+')',
					'-o-transform': 'scale('+scale+')'
				});
				next_fs.css({
					'left': left, 
					'opacity': opacity
				});
			}, 
			duration: 800, 
			complete: function(){
				current_fs.hide();
				animating = false;
			}
		});
	});
	
	$(".previous").click(function(){
		if(animating) return false;
		animating = true;
		current_fs = $(this).parent().parent();
		previous_fs = $(this).parent().parent().prev();
		$("#progressbar li").eq($("fieldset").index(current_fs)).removeClass("active");
		
		//show the previous fieldset
		previous_fs.show(); 
		//hide the current fieldset with style
		current_fs.animate({opacity: 0}, {
			step: function(now, mx) {
				scale = 0.8 + (1 - now) * 0.2;
				left = ((1-now) * 50)+"%";
				opacity = 1 - now;
				current_fs.css({
					'left': left
				});
				previous_fs.css({
					'transform': 'scale('+scale+')',
					'-webkit-transform': 'scale('+scale+')',
					'-moz-transform': 'scale('+scale+')',
					'-ms-transform': 'scale('+scale+')',
					'-o-transform': 'scale('+scale+')',
					'opacity': opacity
				});
			}, 
			duration: 800, 
			complete: function(){
				current_fs.hide();
				animating = false;
			}
		});
	});
});