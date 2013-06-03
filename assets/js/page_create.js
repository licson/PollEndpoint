$(function(){
	var id;
	var step_1_completed = false, step_2_completed = false;
	$('#question_form').validate();
	$('input,select[title]').tooltip();
	$('#status .alert .close').click(function(){
		$('#status .alert').hide(500);
	});
	$('#basic_info').submit(function(e){
		e.preventDefault();
		$('#basic_info').ajaxSubmit({
			dataType:'json',
			success:function(response){
				if(response.success){
					id = response.id;
					$('.p_id').val(response.id);
					step_1_completed = true;
					$('#ques_dialog').modal('show');
				}
				else {
					$('#status .alert .message').text(response.message);
					$('#status .alert').show(500);
				}
			}
		});
		//$('#ques_dialog').modal('show');
	});
	$('#proceed_2').click(function(){
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
							$('html,body').animate({scrollTop:0},500);
							$('#ques_dialog').modal('hide');
						}
						else {
							$('#status .alert .message').text(response.message);
							$('#status .alert').show(500);
							$('#ques_dialog').modal('hide');
						}
					}
				});
			}
			else {
				$('#status .alert .message').text('Please set the questions properly.');
				$('#status .alert').show(500);
				$('#ques_dialog').modal('hide');
			}
		}
		else {
			$('#status .alert .message').text('Please complete step 1 first.');
			$('#status .alert').show(500);
			$('#ques_dialog').modal('hide');
		}
	});
	$('#send').click(function(e){
		if(step_1_completed && step_2_completed){
			window.location.href = "/question/"+id+'?created=1';
		}
		else {
			$('#status .alert .message').text('Please complete step 1 and 2 first.');
			$('#status .alert').show(500);
		}
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
	$(window).on('beforeunload',function(e){
		if(!window.confirm('Are you sure you want to leave?')){
			e.preventDefault();
		}
	});
	$('.tags:first,#basic_info input[name=keywords]').tagsInput();
	
	//Tutorial
	var tour = new Tour({
		useLocalStorage: true
	});
	$('[data-intro]').each(function(i){
		tour.addStep({
			element: this,
			placement: 'top',
			title: 'Step '+ (i + 1),
			content: $(this).attr('data-intro')
		});
	});
	tour.start();
});