.segment "DRAW"
draw256:
 txa
 sta $00
 lda #6
 sta $01
 jsr clear_rank_edges
 lda #4
 sta $05
 lda #14
 sta $06
 lda #24
 sta $07
 lda $0d
 jsr render
 lda #18
 sta $05
 lda #28
 sta $06
 lda #38
 sta $07
 lda $0e
 jsr render
 ldx $10
 jmp $b6d8
render:
 ldy #0
 cmp #0
 bne @hundreds
 lda #56
 ldy #2
 bne @three
@hundreds:
 cmp #100
 bcc @split
 sec
 sbc #100
 iny
 bne @hundreds
@split:
 cpy #0
 beq @two
@three:
 sta $02
 tya
 ldy $05
 jsr digit
 lda $02
 jsr split
 sta $02
 tya
 ldy $06
 jsr digit
 lda $02
 ldy $07
 jmp digit
@two:
 sta $02
 lda $05
 cmp #18
 bne @offsets
 lda $06
 sta $05
 lda $07
 sta $06
@offsets:
 lda $02
 jsr split
 sta $02
 tya
 bne @tens
 lda #10
@tens:
 ldy $05
 jsr digit
 lda $02
 ldy $06
 jmp digit
.segment "DIGITS"
split:
 ldy #0
@loop:
 cmp #10
 bcc @done
 sec
 sbc #10
 iny
 bne @loop
@done: rts
digit:
 ora #$90
 sta ($00),y
 eor #$30
 iny
 sta ($00),y
 rts


; Restore both optional hundreds cells before drawing current ranks.
clear_rank_edges:
 ldy #24
 lda #$be
 sta ($00),y
 iny
 lda #0
 sta ($00),y
 ldy #18
 sta ($00),y
 iny
 lda #$d1
 sta ($00),y
 rts
