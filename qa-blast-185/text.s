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
