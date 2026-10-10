.setcpu "6502"
.segment "CODE"
lda $73fe
cmp #$b5
bne old
lda $2e
cmp #1
bne old
lda $30
cmp #34
bcc old
cmp #40
bcs old
lda $031e
cmp #$40
beq fast
cmp #$db
beq fast
cmp #$e2
bne old
fast:
lda $73c0
beq text
lda $65
beq text
clear:
clc
lda $66
adc #$20
sta $66
lda $67
adc #0
sta $67
inc $65
lda $65
cmp $69
bne clear
lda #0
sta $65
text:
; Preserve native text interpreter, only automatically acknowledge battle text.
lda $6b
pha
lda #1
sta $6b
lda #30
sta $6a
lda #7
sta $5f
jsr $c7f1
pla
sta $6b
rts
old:
jmp $6c56
