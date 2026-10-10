.setcpu "6502"
.segment "CODE"
.export reset_forms, snapshot_target, credit_kill, scale_forms, menu_upgrade
KILLS=$73bb
USED=$73bd
QUEUE=$73be
ALIVE=$73bf
reset_forms:
 pha
 lda #0
 sta KILLS
 sta KILLS+1
 sta QUEUE
 sta ALIVE
 lda $75ae
 and #3
 sta $75ae
 sta USED
 pla
 jmp $ae00
snapshot_target:
 php
 pha
 txa
 pha
 lda #0
 sta ALIVE
 ldx $034d
 cpx #$5a
 bcs snapshot_end
 lda $02a2,x
 cmp #$40
 bcs snapshot_end
 lda $02a4,x
 ora $02a5,x
 beq snapshot_end
 inc ALIVE
snapshot_end:
 pla
 tax
 pla
 plp
 jmp $8e0b
credit_kill:
 php
 pha
 txa
 pha
 lda ALIVE
 beq kill_end
 lda #0
 sta ALIVE
 lda $0330
 ora $0331
 bne kill_end
 lda $7e62
 bne kill_end
 lda $030e
 and #$3f
 cmp #1
 beq goku_kill
 cmp #3
 bne kill_end
 ldx #1
 bne add_kill
goku_kill:
 ldx #0
add_kill:
 lda KILLS,x
 cmp #10
 bcs count_ready
 inc KILLS,x
count_ready:
 jsr upgrade
kill_end:
 pla
 tax
 pla
 plp
 jmp $8e55
; Only stage I can upgrade. Each fighter's threshold is independent.
upgrade:
 lda $2e
 cmp #1
 bne upgrade_end
 ldx #1
upgrade_loop:
 lda KILLS,x
 cmp #10
 bcc next_actor
 lda $75ae
 and stage1,x
 beq next_actor
 lda $75ae
 and stage2,x
 bne next_actor
 lda $75ae
 ora stage2,x
 sta $75ae
 lda QUEUE
 ora stage1,x
 sta QUEUE
 lda $0678
 cmp #$ff
 beq refresh_right
 ora #$80
 sta $0678
refresh_right:
 lda $0688
 cmp #$ff
 beq next_actor
 ora #$80
 sta $0688
next_actor:
 dex
 bpl upgrade_loop
upgrade_end:
 ; The hosted player acknowledges the cut-in before native combat continues.
 ; As with the encounter selector, NMI keeps running inside this bounded input
 ; gate. Standalone runs without the host marker never wait for browser UI.
 lda $7c4b
 cmp #$a5
 bne gate_done
banner_gate:
 lda QUEUE
 and #3
 bne banner_gate
gate_done:
 rts
stage1: .byte 1,2
stage2: .byte 4,8
menu_upgrade:
 jsr upgrade
 lda $2e
 cmp #1
 jmp $a3ba
; Original helper multiplies unsigned64 by100 with saturation. Repeat for II.
scale_forms:
 and #$3f
 cmp #1
 beq goku_scale
 cmp #3
 bne scale_end
 lda $75ae
 and #2
 beq scale_end
 lda $75ae
 and #8
 jmp do_scale
goku_scale:
 lda $75ae
 and #1
 beq scale_end
 lda $75ae
 and #4
do_scale:
 pha
 jsr $ace6
 pla
 beq scale_end
 jmp $ace6
scale_end:
 rts
