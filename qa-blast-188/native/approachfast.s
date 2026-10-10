.setcpu "6502"
.segment "CODE"
lda $73fe
cmp #$b5
bne old
lda $73c0
beq old
lda $02
and #$40
beq right
lda $0679,y
and #3
ora #$9c
sta $0679,y
lda #$ff
sta $067a,y
rts
right:
lda $0679,y
and #3
ora #$60
sta $0679,y
lda #1
sta $067a,y
rts
old:
jsr $65cf
.byte 13
.word $8fca
