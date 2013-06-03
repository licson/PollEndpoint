$(function(){
	if(window.location.search.indexOf('hideui=1')>-1){
		$('*').hide();
		$('#stats').show();
	}
	var update = function(){
		$.ajax({
			url:'./time/'+window.ques_id,
			dataType:'json',
			cache:false,
			success:function(data){
				if(data.length <= 1){
					$('#tips-overview').show(500);
				}
				Flotr.draw($('#date')[0],[{data:data,label:'Poll submitted'}],{
					title:'People answered per day',
					xaxis:{
						mode:'time',
						title:'Time'
					},
					yaxis:{
						min:0
					},
					mouse:{
						track:true,
						relative:true,
						trackFormatter:function(o){
							return o.y+' Persons';
						}
					},
					points:{
						show:true
					},
					lines:{
						show:true
					}
				});
			}
		});
		//setTimeout(update,5000);
	};
	update();
	
	$('#refresh').click(update);
	
	$('.questions tr[data-id]').click(function(){
		var id = $(this).attr('data-id');
		$.ajax({
			url:'./question/'+id,
			cache:false,
			dataType:'json',
			success:function(data){
				if(data.html){
					$('#ques_dialog .modal-body :not(.chart) :not(.answers)').remove();
					$('#ques_dialog .modal-body .chart').hide();
					$('#ques_dialog .modal-body .answers').hide();
					$('#ques_dialog .modal-body').append(data.html);
					$('#ques_dialog').modal('show');
				}
				else {
					$('#ques_dialog .modal-body :not(.chart) :not(.answers)').remove();
					$('#ques_dialog .chart').show();
					$('#ques_dialog .modal-body .answers').hide();
					$('#ques_dialog').modal('show');
					$('#ques_dialog').on('shown',function(){
						Flotr.draw($('#ques_dialog .chart')[0],data,{
							title:'Choices answered',
							xaxis:{
								showLabels:false
							},
							yaxis:{
								showLabels:false
							},
							pie:{
								show:true,
								explode:6
							},
							mouse:{
								track:true,
								relative:true,
								trackFormatter:function(o){
									return Math.floor(o.y)+' Persons';
								}
							},
							spreadsheet:{
								show:true,
								tickFormatter:function(){
									return "Count";
								}
							}
						});
					});
				}
			}
		});
	});
	$('.questionnaires').dataTable();
	$(document).on('click','.questionnaires tr[data-id]',function(){
		var time = $(this).attr('data-id');
		$.ajax({
			url:'./questionnaire/'+window.ques_id+'/'+time,
			dataType:'json',
			cache:false,
			success:function(data){
				$('#ques_dialog .modal-body :not(.chart) :not(.answers)').remove();
				$('#ques_dialog .modal-body .chart').hide();
				var container = $('#ques_dialog .modal-body .answers').show();
				$.each(data,function(i,ele){
					$('<div class="well">')
					.append($('<p>',{text: 'Question: '+ele.name}))
					.append($('<em>',{text: 'Answer: '+ele.value}))
					.appendTo(container);
				});
				$('#ques_dialog').modal('show');
			}
		});
	});
});