.setcpu "6502"
.segment "CODE"
; Raw duration arrives in A, already consumed once by original $87C8.
pha
lda $73fe
cmp #$b5
bne old
lda $73c0
beq old
pla
lda #0
rts
old:
jsr $6c30
bcc original
lda $0321,x
cmp #$24
bcs original
pla
tay
lda $0321,x
cmp #$10
bne regular
cpy #$1e
bne regular
lda #0
rts
regular:
iny
beq minus
tya
and #7
beq div8
tya
and #3
beq div4
tya
and #1
beq div2
minus: tya
sec
sbc #1
rts
div8: tya
lsr a
lsr a
lsr a
sec
sbc #1
rts
div4: tya
lsr a
lsr a
sec
sbc #1
rts
div2: tya
lsr a
sec
sbc #1
rts
original: pla
rts
