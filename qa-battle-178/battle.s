.setcpu "6502"
.export range, total, count, reset
.segment "CODE"
PENDING=$7396
TOTAL=$7398
LOADED=$739a
HIGH=$739c
MAGIC=$73b5

reset:
 txa
 pha
 lda #0
 ldx #5
@clear: sta PENDING,x
 dex
 bpl @clear
 sta MAGIC
 pla
 tax
 jmp $9874

range:
 pha
 lda $7391
 cmp #4
 bne @large
 ldx #21
 ldy #50
 bne @done
@large:
 cmp #5
 bcc @done
 ldx #21
 ldy #0
@done:
 stx $7392
 pla
 rts

total:
 clc
 adc $7393
 pha
 lda #0
 sta PENDING
 sta PENDING+1
 sta TOTAL+1
 sta LOADED+1
 sta MAGIC
 pla
 sta TOTAL
 sta LOADED
 pha
 lda $7391
 cmp #5
 bcs @expanded
 pla
 rts
@expanded:
 pla
 clc
 adc #180
 sta TOTAL
 lda #0
 adc #0
 sta TOTAL+1
 lda $7391
 cmp #6
 bne @subtract
 clc
 lda TOTAL
 adc #200
 sta TOTAL
 lda TOTAL+1
 adc #0
 sta TOTAL+1
@subtract:
 sec
 lda TOTAL
 sbc #100
 sta PENDING
 lda TOTAL+1
 sbc #0
 sta PENDING+1
 txa
 pha
 ldx #24
@high:
 lda $7ea0,x
 sta HIGH,x
 dex
 bpl @high
 pla
 tax
 lda #$b8
 sta MAGIC
 lda #100
 sta LOADED
 rts

count:
 jsr $6923
 cpy #0
 beq @empty
 rts
@empty:
 lda MAGIC
 cmp #$b8
 bne @done
 lda PENDING
 ora PENDING+1
 bne @refill
@done:
 ldy #0
 rts
@refill:
 txa
 pha
 ldx #23
@pushzp:
 lda $00,x
 pha
 dex
 bpl @pushzp
 ldx #24
@pushhigh:
 lda $7ea0,x
 pha
 lda HIGH,x
 sta $7ea0,x
 dex
 bpl @pushhigh
 lda PENDING+1
 bne @hundred
 lda PENDING
 cmp #100
 bcc @batch
@hundred: lda #100
@batch:
 sta $7372
 sta $00
 sec
 lda PENDING
 sbc $00
 sta PENDING
 lda PENDING+1
 sbc #0
 sta PENDING+1
 clc
 lda LOADED
 adc $00
 sta LOADED
 lda LOADED+1
 adc #0
 sta LOADED+1
 lda $00
 ldx #1
@pages:
 cmp #6
 bcc @pagesdone
 sec
 sbc #5
 inx
 bne @pages
@pagesdone:
 stx $7373
 jsr $688f
 jsr $83e8
 ldx #0
@pophigh:
 pla
 sta $7ea0,x
 inx
 cpx #25
 bcc @pophigh
 ldx #0
@popzp:
 pla
 sta $00,x
 inx
 cpx #24
 bcc @popzp
 pla
 tax
 ldy $7372
 rts
